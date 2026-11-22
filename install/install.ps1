# AI Translate - install, update or remove it, on Windows.
#
#   irm https://builds.zolatau.com/install.ps1 | iex
#
# Nothing is built here and nothing else needs installing. Vencord with AI
# Translate already inside comes ready-made from builds.zolatau.com, where a
# build robot puts it whenever Vencord or the plugin changes. Vencord's own
# installer then points Discord at it.
#
# Everything lives in %LOCALAPPDATA%\ai-translate. Running this again updates
# the files, or removes them.
#
# The whole file is one script block, so nothing it defines is left behind in
# the window it was pasted into.

& {
    # A copy installed before 0.2.4a lives in $OldHome, and Discord loads it
    # from there until it is patched again. Only the default folder is ever
    # moved: one named in AIT_HOME stays where its owner put it.
    $OldHome = $null
    if ($env:AIT_HOME) { $AitHome = $env:AIT_HOME }
    else {
        $AitHome = Join-Path $env:LOCALAPPDATA "ai-translate"
        # The folder's name before 0.2.4a, read only to move a copy out of it.
        $OldHome = Join-Path $env:LOCALAPPDATA "aiTranslate"
        if (-not (Test-Path -LiteralPath $OldHome -PathType Container)) { $OldHome = $null }
    }
    $Dist = Join-Path $AitHome "dist"
    $Builds = "https://builds.zolatau.com"

    # Released builds are handed out at the root, testing builds from a folder
    # of their own. $env:AIT_CHANNEL = "testing" installs those: the plugin's
    # main branch, built the same way but not released. The plugin's own
    # settings then say which builds a copy follows and switch it back.
    if ($env:AIT_CHANNEL -eq "testing") { $Builds = "$Builds/testing" }
    $VencordInstaller = "https://github.com/Vencord/Installer/releases/latest/download/VencordInstallerCli.exe"

    # What Discord loads, named as Vencord's own updater names them.
    $Files = @("patcher.js", "preload.js", "renderer.js", "renderer.css")

    # Windows PowerShell predates TLS 1.2 being everyone's default, and the
    # sites it downloads from accept nothing older.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    # irm | iex runs inside the user's own window, where exit would close it.
    # Stopping early is a throw instead, caught at the bottom of the file.
    function Stop-Here([string]$Message) {
        throw [System.OperationCanceledException]::new($Message)
    }

    # Up and down arrows move, Enter picks, a digit picks at once. Where keys
    # cannot be read one by one, typing the number works instead.
    function Select-Option([string]$Title, [string[]]$Options) {
        Write-Host $Title

        $index = 0
        $draw = {
            for ($i = 0; $i -lt $Options.Count; $i++) {
                if ($i -eq $index) { Write-Host ("  > " + $Options[$i] + "   ") -ForegroundColor Cyan }
                else { Write-Host ("    " + $Options[$i] + "   ") }
            }
        }

        try {
            if ([Console]::IsInputRedirected) { throw [System.InvalidOperationException]::new() }

            & $draw
            $top = [Console]::CursorTop - $Options.Count
            [Console]::CursorVisible = $false

            while ($true) {
                $key = [Console]::ReadKey($true)
                $digit = [string]$key.KeyChar

                if ($key.Key -eq "Enter") { break }
                elseif ($key.Key -eq "UpArrow") { $index = ($index - 1 + $Options.Count) % $Options.Count }
                elseif ($key.Key -eq "DownArrow") { $index = ($index + 1) % $Options.Count }
                elseif ($digit -match "^[1-9]$" -and [int]$digit -le $Options.Count) { $index = [int]$digit - 1 }
                else { continue }

                [Console]::SetCursorPosition(0, $top)
                & $draw
                if ($digit -match "^[1-9]$") { break }
            }
        }
        catch {
            for ($i = 0; $i -lt $Options.Count; $i++) { Write-Host ("  {0}  {1}" -f ($i + 1), $Options[$i]) }
            $typed = Read-Host "Choose [1]"
            $number = 0
            if ([int]::TryParse($typed, [ref]$number) -and $number -ge 1 -and $number -le $Options.Count) { $index = $number - 1 }
        }
        finally {
            try { [Console]::CursorVisible = $true } catch { }
        }

        return $index
    }

    # The progress bar is switched off while downloading: in Windows
    # PowerShell it slows a download down many times over.
    function Get-File([string]$Url, [string]$Path) {
        $saved = $ProgressPreference
        $ProgressPreference = "SilentlyContinue"
        try {
            Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing -ErrorAction Stop
        }
        catch {
            Stop-Here "Could not download $Url. Check your connection and try again."
        }
        finally {
            $ProgressPreference = $saved
        }
    }

    # Where Discord's own installer puts each version. Vencord's installer
    # looks in exactly these folders, and every process of a version carries
    # the name of its folder.
    $DiscordVersions = [ordered]@{
        Stable      = "Discord"
        PTB         = "DiscordPTB"
        Canary      = "DiscordCanary"
        Development = "DiscordDevelopment"
    }

    # Vencord's installer asks which Discord to work on itself, but by then
    # Discord has had to be closed already, and nothing here knows which one to
    # close. So the question is asked first and the answer handed to it.
    function Select-Discord([string]$Title) {
        $found = @()
        $options = @()
        foreach ($version in $DiscordVersions.Keys) {
            $path = Join-Path $env:LOCALAPPDATA $DiscordVersions[$version]
            if (Test-Path $path) {
                $found += [pscustomobject]@{ Label = "$version - $path"; Path = $path }
                $options += "$version - $path"
            }
        }

        # Built in the loop: @($found.Label) of an empty list is one blank item.
        $index = Select-Option $Title ($options + "Another folder")
        if ($index -lt $found.Count) { return $found[$index].Path }

        $typed = (Read-Host "Path to the Discord folder").Trim('"', " ")
        if (-not $typed) { Stop-Here "Nothing was typed, so nothing was changed." }
        if (-not (Test-Path $typed)) { Stop-Here "There is no folder $typed." }
        return $typed
    }

    # Vencord's installer closes only one of Discord's many processes. The
    # others can still be running, even finishing an update of Discord's own,
    # and then the patch fails halfway with "cannot find the file specified".
    # They all answer to the name of the folder they run from, so every process
    # of the chosen Discord goes and no other version is touched.
    function Close-Discord([string]$Path) {
        $running = @(Get-Process -Name (Split-Path $Path -Leaf) -ErrorAction SilentlyContinue)
        if (-not $running) { return }

        Write-Host "Closing Discord..."
        $running | Stop-Process -Force -ErrorAction SilentlyContinue
        $running | Wait-Process -Timeout 15 -ErrorAction SilentlyContinue
    }

    # Vencord's own installer, told to point Discord at these files instead of
    # downloading plain Vencord, and told which Discord to work on so that it
    # does not ask a second time.
    function Invoke-VencordInstaller([string]$Action, [string]$Title, [string]$Failure) {
        $cli = Join-Path $AitHome "VencordInstallerCli.exe"
        Get-File $VencordInstaller $cli

        $discord = Select-Discord $Title
        Close-Discord $discord

        $env:VENCORD_USER_DATA_DIR = $AitHome
        $env:VENCORD_DEV_INSTALL = "1"
        try {
            & $cli $Action --location $discord
            if ($LASTEXITCODE -ne 0) { Stop-Here $Failure }
        }
        finally {
            Remove-Item Env:VENCORD_USER_DATA_DIR, Env:VENCORD_DEV_INSTALL -ErrorAction SilentlyContinue
        }
    }

    # The path a patched app.asar requires. Vencord's installer writes
    # require("...") with the path as JSON, so it is decoded, not matched.
    function Get-RequiredPath([string]$Asar) {
        $file = Get-Item -LiteralPath $Asar -Force -ErrorAction SilentlyContinue
        # A patched app.asar is a few hundred bytes; Discord's own is megabytes.
        if (-not $file -or $file.PSIsContainer -or $file.Length -gt 65536) { return $null }
        try {
            $text = [IO.File]::ReadAllText($file.FullName, [Text.Encoding]::UTF8)
            $match = [regex]::Match($text, 'require\(("(?:[^"\\]|\\.)*")\)')
            if (-not $match.Success) { return $null }
            return ('{"path":' + $match.Groups[1].Value + '}' | ConvertFrom-Json).path
        }
        catch { return $null }
    }

    # Windows paths ignore case, and Vencord's installer writes backslashes.
    function Test-Inside([string]$Path, [string]$Folder) {
        $Folder = $Folder.Replace('/', '\').TrimEnd('\') + '\'
        return $Path.Replace('/', '\').StartsWith($Folder, [StringComparison]::OrdinalIgnoreCase)
    }

    # Each Discord that still loads AI Translate from inside a folder, of those
    # Vencord's installer looks for. It patches, and Discord runs, only the
    # app-* whose resources path sorts last byte by byte, as Go compares it;
    # older ones stay behind after Discord updates itself.
    function Get-DiscordLoadingFrom([string]$Folder) {
        foreach ($name in $DiscordVersions.Values) {
            $path = Join-Path $env:LOCALAPPDATA $name
            $newest = $null
            foreach ($dir in @(Get-ChildItem -LiteralPath $path -Directory -Force -ErrorAction SilentlyContinue)) {
                if (-not $dir.Name.StartsWith("app-", [StringComparison]::Ordinal)) { continue }
                $resources = Join-Path $dir.FullName "resources"
                if (-not (Test-Path -LiteralPath $resources)) { continue }
                $key = $dir.Name + "\resources"
                if (-not $newest -or [string]::CompareOrdinal($key, $newest.Key) -gt 0) {
                    $newest = @{ Key = $key; Resources = $resources }
                }
            }
            if (-not $newest) { continue }
            $required = Get-RequiredPath (Join-Path $newest.Resources "app.asar")
            if ($required -and (Test-Inside $required $Folder)) { $path }
        }
    }

    # A folder about to be deleted stays while a Discord still loads AI
    # Translate from it, and the run stops there, so the next one patches again.
    function Stop-WhileLoaded([string]$Folder) {
        if (-not (Test-Path -LiteralPath $Folder -PathType Container)) { return }
        $left = @(Get-DiscordLoadingFrom $Folder)
        if ($left.Count -eq 0) { return }
        Write-Host ""
        Write-Host "A Discord still loads AI Translate from $($Folder):"
        foreach ($path in $left) { Write-Host "  $path" }
        Stop-Here "So $Folder is kept. Run this again and patch that Discord too."
    }

    function Install-AiTranslate {
        # "ait-build.json" is what the file was called before it was renamed.
        $first = -not ((Test-Path (Join-Path $Dist "build.json")) -or (Test-Path (Join-Path $Dist "ait-build.json")) -or $OldHome)

        # The first installer built Vencord in a folder of its own, and Discord
        # keeps pointing there until it is patched again. So does a copy in the
        # old folder: the files arrive in the new one, Discord is pointed at
        # them, and only then does the old folder go, so Discord never points
        # at nothing.
        $old = Join-Path $AitHome "Vencord"
        $moving = (Test-Path $old) -or $OldHome

        New-Item -ItemType Directory -Force -Path $Dist | Out-Null

        Write-Host "Downloading AI Translate..."
        $info = Join-Path $AitHome "build.json"
        Get-File "$Builds/build.json" $info
        $build = (Get-Content $info -Raw | ConvertFrom-Json).build
        if (-not $build) { Stop-Here "The download came back wrong. Try again in a few minutes." }

        # Everything arrives before anything is replaced.
        foreach ($name in $Files) { Get-File "$Builds/$build/$name" (Join-Path $Dist "$name.new") }
        foreach ($name in $Files) { Move-Item -Force (Join-Path $Dist "$name.new") (Join-Path $Dist $name) }
        Move-Item -Force $info (Join-Path $Dist "build.json")
        Remove-Item -Force (Join-Path $Dist "ait-build.json") -ErrorAction SilentlyContinue

        # Discord only needs patching once: after that it loads these files
        # from disk, so an update is simply new files. On the first install
        # there is nothing to ask about, and the installer asks which Discord
        # itself. Only a Discord update of its own can undo the patch, and that
        # is the one case worth a question.
        $patch = if ($first -or $moving) { $true }
        else {
            (Select-Option "Patch Discord again? Only needed if AI Translate vanished after Discord updated." @("No", "Yes")) -eq 1
        }

        if ($patch) {
            if ($OldHome) { Write-Host "AI Translate moves from $OldHome to $AitHome, so Discord is patched again." }
            Invoke-VencordInstaller "--install" "Which Discord should be patched?" "Patching Discord failed."

            # Another Discord on this computer (PTB, Canary) may have been
            # patched to the old folder, and fails to start once that is
            # deleted. The old folder goes only after every one of them is
            # patched; a failed or cancelled patch throws from here with it
            # kept, and the next run moves again.
            if ($OldHome) {
                while ((Select-Option "Did another Discord on this computer have AI Translate too?" @("No", "Yes")) -eq 1) {
                    Invoke-VencordInstaller "--install" "Which Discord should be patched?" "Patching Discord failed."
                }
            }

            # Answering No above can leave a Discord still patched to a folder
            # about to go, and it would no longer start.
            if ($moving) {
                Stop-WhileLoaded $old
                Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction SilentlyContinue
            }
            if ($OldHome) {
                Stop-WhileLoaded $OldHome
                try { Remove-Item -LiteralPath $OldHome -Recurse -Force -ErrorAction Stop }
                catch { Write-Host "Could not delete $OldHome. Delete it by hand." -ForegroundColor Yellow }
            }
        }

        Write-Host ""
        Write-Host "Done. Start Discord again." -ForegroundColor Green
        if ($first) {
            Write-Host "AI Translate is already on: open its settings, choose a provider and paste your key."
            Write-Host "From now on it updates itself; this command is only needed to repair or remove it."
        }
    }

    function Remove-AiTranslate {
        if (-not (Test-Path $AitHome)) { Stop-Here "Nothing to remove: $AitHome does not exist." }

        Write-Host "Removing the patch from Discord..."
        Invoke-VencordInstaller "--uninstall" "Which Discord should the patch be removed from?" "Removing the patch failed."

        if ((Select-Option "Also delete the downloaded files in $($AitHome)?" @("No", "Yes")) -eq 1) {
            try {
                Remove-Item -LiteralPath $AitHome -Recurse -Force -ErrorAction Stop
                if ($OldHome) { Remove-Item -LiteralPath $OldHome -Recurse -Force -ErrorAction Stop }
                Write-Host "Deleted $AitHome."
            }
            catch {
                Write-Host "Some files could not be deleted. Delete the folder $AitHome by hand." -ForegroundColor Yellow
            }
        }

        Write-Host ""
        Write-Host "Done. Start Discord again." -ForegroundColor Green
    }

    try {
        $choice = Select-Option "AI Translate" @("Install or update", "Remove")
        if ($choice -eq 1) {
            # A copy never moved out of the old folder is removed where it is.
            if ($OldHome -and -not (Test-Path $AitHome)) { $AitHome = $OldHome; $OldHome = $null }
            Remove-AiTranslate
        }
        else { Install-AiTranslate }
    }
    catch [System.OperationCanceledException] {
        Write-Host ""
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}
