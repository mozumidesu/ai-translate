# AI Translate - install, update or remove it, on Windows.
#
#   irm https://builds.zolatau.com/install.ps1 | iex
#
# Nothing is built here and nothing else needs installing. Vencord with AI
# Translate already inside comes ready-made from builds.zolatau.com, where a
# build robot puts it whenever Vencord or the plugin changes. Vencord's own
# installer then points Discord at it.
#
# Everything lives in %LOCALAPPDATA%\aiTranslate. Running this again updates
# the files, or removes them.
#
# The whole file is one script block, so nothing it defines is left behind in
# the window it was pasted into.

& {
    $AitHome = if ($env:AIT_HOME) { $env:AIT_HOME } else { Join-Path $env:LOCALAPPDATA "aiTranslate" }
    $Dist = Join-Path $AitHome "dist"
    $Builds = "https://builds.zolatau.com"
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
        foreach ($version in $DiscordVersions.Keys) {
            $path = Join-Path $env:LOCALAPPDATA $DiscordVersions[$version]
            if (Test-Path $path) { $found += [pscustomobject]@{ Label = "$version - $path"; Path = $path } }
        }

        $index = Select-Option $Title (@($found.Label) + "Another folder")
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

    function Install-AiTranslate {
        # "ait-build.json" is what the file was called before it was renamed.
        $first = -not ((Test-Path (Join-Path $Dist "build.json")) -or (Test-Path (Join-Path $Dist "ait-build.json")))

        # The first installer built Vencord in a folder of its own, and Discord
        # keeps pointing there until it is patched again.
        $old = Join-Path $AitHome "Vencord"
        $moving = Test-Path $old

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
            Invoke-VencordInstaller "--install" "Which Discord should be patched?" "Patching Discord failed."
            if ($moving) { Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction SilentlyContinue }
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
        if ($choice -eq 1) { Remove-AiTranslate } else { Install-AiTranslate }
    }
    catch [System.OperationCanceledException] {
        Write-Host ""
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}
