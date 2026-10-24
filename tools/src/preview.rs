/*
 * The site, on this computer, served out of public/ the way Cloudflare serves
 * it: a folder is its index.html, anything missing is 404.html.
 *
 * What it does not do is the Worker's work. worker.js decides which domain
 * serves what and sends the redirects, and none of that is here. Locally the
 * personal page is at / and the plugin's page at /translate/, which is where
 * the files are. The rules in public/_headers are not applied either; nothing
 * is cached here, which is what you want while looking at a change.
 */

use crate::cli::Cli;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Component, Path, PathBuf};

pub const HELP: &str = "\
Serve the site's public/ folder on this computer.

  tools preview [--root <path>] [--port <number>]

  --root <path>     The website repository. The current folder by default
  --port <number>   Which port to listen on. 8787 by default

The personal page is at / and the plugin's page at /translate/, which is
where their files are. The redirects in worker.js and the rules in
public/_headers are not reproduced, and nothing is cached.

Stop it with Ctrl+C.
";

const PUBLIC: &str = "public";
const DEFAULT_PORT: u16 = 8787;

pub fn run(cli: &mut Cli) -> Result<(), String> {
    let root = cli.root()?;
    let port = match cli.value("--port")? {
        Some(given) => given
            .parse::<u16>()
            .map_err(|_| format!("\"{given}\" is not a port number."))?,
        None => DEFAULT_PORT,
    };
    cli.nothing_left()?;

    let folder = root.join(PUBLIC);
    if !folder.is_dir() {
        return Err(format!(
            "there is no {} here. Point --root at the website repository.",
            folder.display()
        ));
    }

    let at = ("127.0.0.1", port);
    let listening = TcpListener::bind(at).map_err(|e| match e.kind() {
        std::io::ErrorKind::AddrInUse => {
            format!("port {port} is taken. Try another one with --port.")
        }
        _ => format!("could not listen on port {port}: {e}"),
    })?;

    println!("Serving {} on http://localhost:{port}/", folder.display());
    println!("The plugin's page is at http://localhost:{port}/translate/");
    println!("Ctrl+C stops it.");

    for coming in listening.incoming() {
        match coming {
            Ok(stream) => {
                let folder = folder.clone();
                // A browser opens several connections at once, so each gets
                // its own thread and the next one never waits.
                std::thread::spawn(move || {
                    if let Err(e) = answer(stream, &folder) {
                        eprintln!("  {e}");
                    }
                });
            }
            Err(e) => eprintln!("  a connection failed: {e}"),
        }
    }

    Ok(())
}

fn answer(mut stream: TcpStream, folder: &Path) -> Result<(), String> {
    let mut reader = BufReader::new(
        stream
            .try_clone()
            .map_err(|e| format!("could not read the request: {e}"))?,
    );

    let mut first = String::new();
    if reader.read_line(&mut first).is_err() || first.trim().is_empty() {
        return Ok(());
    }

    // The headers are read and dropped: nothing here depends on them.
    loop {
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) if line == "\r\n" || line == "\n" => break,
            Ok(_) => continue,
            Err(_) => break,
        }
    }

    let mut parts = first.split_whitespace();
    let method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        say(
            &mut stream,
            405,
            "text/plain; charset=utf-8",
            b"Method not allowed",
            true,
        );
        println!("  {method} {target} -> 405");
        return Ok(());
    }

    let asked = target.split(['?', '#']).next().unwrap_or("/");
    let asked = decode(asked);

    let Some(inside) = safe_path(&asked) else {
        say(
            &mut stream,
            403,
            "text/plain; charset=utf-8",
            b"Forbidden",
            method == "GET",
        );
        println!("  {method} {asked} -> 403");
        return Ok(());
    };

    let wanted = folder.join(&inside);

    // A folder asked for without its slash would make every relative link in
    // it resolve one level too high, so send the browser to the slash first.
    if wanted.is_dir() && !asked.ends_with('/') {
        let to = format!("{asked}/");
        let head = format!(
            "HTTP/1.1 301 Moved Permanently\r\nLocation: {to}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        );
        let _ = stream.write_all(head.as_bytes());
        println!("  {method} {asked} -> 301 {to}");
        return Ok(());
    }

    let file = if wanted.is_dir() {
        wanted.join("index.html")
    } else {
        wanted
    };

    match fs::read(&file) {
        Ok(body) => {
            let kind = content_type(&file);
            let size = body.len();
            say(&mut stream, 200, kind, &body, method == "GET");
            println!("  {method} {asked} -> 200 {size} bytes");
        }
        Err(_) => {
            let page = folder.join("404.html");
            match fs::read(&page) {
                Ok(body) => say(
                    &mut stream,
                    404,
                    "text/html; charset=utf-8",
                    &body,
                    method == "GET",
                ),
                Err(_) => say(
                    &mut stream,
                    404,
                    "text/plain; charset=utf-8",
                    b"Not found",
                    method == "GET",
                ),
            }
            println!("  {method} {asked} -> 404");
        }
    }

    Ok(())
}

fn say(stream: &mut TcpStream, code: u16, kind: &str, body: &[u8], with_body: bool) {
    let reason = match code {
        200 => "OK",
        301 => "Moved Permanently",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "OK",
    };

    // Nothing is cached: a preview that shows yesterday's file is worse than
    // no preview at all.
    let head = format!(
        "HTTP/1.1 {code} {reason}\r\n\
         Content-Type: {kind}\r\n\
         Content-Length: {}\r\n\
         Cache-Control: no-store\r\n\
         Connection: close\r\n\r\n",
        body.len()
    );

    let _ = stream.write_all(head.as_bytes());
    if with_body {
        let _ = stream.write_all(body);
    }
    let _ = stream.flush();
}

/// %20 and the like, which a path with a space in it arrives as.
fn decode(target: &str) -> String {
    let raw = target.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(raw.len());
    let mut at = 0;

    while at < raw.len() {
        if raw[at] == b'%' && at + 2 < raw.len() {
            let pair = std::str::from_utf8(&raw[at + 1..at + 3]).ok();
            if let Some(byte) = pair.and_then(|p| u8::from_str_radix(p, 16).ok()) {
                out.push(byte);
                at += 3;
                continue;
            }
        }
        out.push(raw[at]);
        at += 1;
    }

    String::from_utf8_lossy(&out).into_owned()
}

/// A path under public/ and nowhere else: no .., no root, no Windows prefix.
fn safe_path(asked: &str) -> Option<PathBuf> {
    let mut inside = PathBuf::new();

    for piece in asked.split('/') {
        if piece.is_empty() || piece == "." {
            continue;
        }
        let as_path = Path::new(piece);
        for part in as_path.components() {
            match part {
                Component::Normal(name) => inside.push(name),
                _ => return None,
            }
        }
    }

    Some(inside)
}

fn content_type(file: &Path) -> &'static str {
    let ending = file
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ending.as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "txt" | "md" => "text/plain; charset=utf-8",
        "xml" => "application/xml; charset=utf-8",
        "webmanifest" => "application/manifest+json",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn asked_for(target: &str) -> Option<String> {
        safe_path(target).map(|p| p.to_string_lossy().replace('\\', "/"))
    }

    #[test]
    fn a_path_inside_public_is_allowed() {
        assert_eq!(asked_for("/").unwrap(), "");
        assert_eq!(asked_for("/translate/").unwrap(), "translate");
        assert_eq!(
            asked_for("/assets/css/site.css").unwrap(),
            "assets/css/site.css"
        );
        assert_eq!(asked_for("/./assets//css/").unwrap(), "assets/css");
    }

    #[test]
    fn nothing_climbs_out_of_public() {
        assert!(asked_for("/../CLAUDE.md").is_none());
        assert!(asked_for("/assets/../../LICENSE").is_none());
        assert!(asked_for("/..").is_none());
    }

    #[test]
    fn percent_escapes_are_undone_before_the_path_is_judged() {
        assert_eq!(decode("/assets/a%20file.css"), "/assets/a file.css");
        assert_eq!(decode("/%2e%2e/LICENSE"), "/../LICENSE");
        // Undone first, so an escaped climb is refused like a plain one.
        assert!(asked_for(&decode("/..%2fLICENSE")).is_none());
        // Anything that is not an escape is left as it stands.
        assert_eq!(decode("/100%"), "/100%");
        assert_eq!(decode("/a%zz"), "/a%zz");
    }

    #[test]
    fn the_types_the_site_serves_are_named() {
        assert_eq!(
            content_type(Path::new("a/index.html")),
            "text/html; charset=utf-8"
        );
        assert_eq!(
            content_type(Path::new("site.css")),
            "text/css; charset=utf-8"
        );
        assert_eq!(
            content_type(Path::new("ro.js")),
            "text/javascript; charset=utf-8"
        );
        assert_eq!(content_type(Path::new("dela.woff2")), "font/woff2");
        assert_eq!(content_type(Path::new("seal.PNG")), "image/png");
        assert_eq!(
            content_type(Path::new("whatever")),
            "application/octet-stream"
        );
    }
}
