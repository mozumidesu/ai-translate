# What test/installer/cases.ps1 runs install/install.ps1's functions beside:
# the script's own definitions taken from its AST, stubs for the menu, the
# keyboard, downloads and closing Discord, a fake of Vencord's installer CLI
# written after its Go source, and a fake %LOCALAPPDATA% under $Root.
param([string]$ScriptPath, [string]$Root)
$ErrorActionPreference = "Stop"

# The script's own definitions, never its main try block, which downloads.
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw "parse errors" }
$block = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.ScriptBlockExpressionAst] }, $true).ScriptBlock
$statements = $block.EndBlock.Statements
foreach ($s in $statements) {
    $isFn = $s -is [System.Management.Automation.Language.FunctionDefinitionAst]
    $isVar = $s -is [System.Management.Automation.Language.AssignmentStatementAst] -and $s.Left.Extent.Text -in '$DiscordVersions', '$Downloaded', '$Files', '$VencordInstaller'
    if ($isFn -or $isVar) { . ([scriptblock]::Create($s.Extent.Text)) }
}
$script:Builds = "https://builds.example"

# --- Stubs.
$script:Answers = [System.Collections.Generic.Queue[object]]::new()
$script:Asked = [System.Collections.Generic.List[object]]::new()
function Select-Option([string]$Title, [string[]]$Options) {
    $script:Asked.Add([pscustomobject]@{ Title = $Title; Options = $Options })
    if ($script:Answers.Count -eq 0) { throw "Unexpected question: $Title [$($Options -join ' | ')]" }
    return $script:Answers.Dequeue()
}
$script:Typed = ""
function Read-Host([string]$Prompt) { return $script:Typed }
$script:CliDownloads = 0
function Get-File([string]$Url, [string]$Path) {
    if ($Url -eq $VencordInstaller) {
        $script:CliDownloads++
        Set-Content -LiteralPath $Path -Value "fake cli"
        # & $cli finds an alias by its full path before any file.
        Set-Alias -Name $Path -Value Invoke-FakeCli -Scope Global
    }
    elseif ($Url.EndsWith("/build.json")) { Set-Content -LiteralPath $Path -Value '{"build":"b1"}' }
    else { Set-Content -LiteralPath $Path -Value "file" }
}
function Close-Discord([string]$Path) { }

# Go's json.Marshal of a string: \ and " escaped, < > & as < etc.
function ConvertTo-GoJson([string]$s) {
    $b = [Text.StringBuilder]::new('"')
    foreach ($c in $s.ToCharArray()) {
        switch -CaseSensitive ([string]$c) {
            '\' { [void]$b.Append('\\') } '"' { [void]$b.Append('\"') }
            '<' { [void]$b.Append('\' + 'u003c') } '>' { [void]$b.Append('\' + 'u003e') } '&' { [void]$b.Append('\' + 'u0026') }
            default { [void]$b.Append($c) }
        }
    }
    [void]$b.Append('"'); return $b.ToString()
}
# Vencord/Installer's WriteAppAsar (app_asar.go): four int32s, the JSON
# header padded with "0", then index.js and package.json.
function Write-PatchedAsar([string]$Asar, [string]$Patcher) {
    $index = "require(" + (ConvertTo-GoJson $Patcher) + ")"
    $pkg = "{`n`t`"name`": `"discord`",`n`t`"main`": `"index.js`"`n}"
    $utf8 = [Text.UTF8Encoding]::new($false)
    $iLen = $utf8.GetByteCount($index)
    $header = '{"files":{"index.js":{"size":' + $iLen + ',"offset":"0"},"package.json":{"size":' + $utf8.GetByteCount($pkg) + ',"offset":"' + $iLen + '"}}}'
    $hLen = $utf8.GetByteCount($header)
    $aligned = ($hLen + 3) -band -bnot 3
    $header += "0" * ($aligned - $hLen)
    $ms = [IO.MemoryStream]::new(); $w = [IO.BinaryWriter]::new($ms)
    foreach ($n in 4, ($aligned + 8), ($aligned + 4), $hLen) { $w.Write([int32]$n) }
    $w.Write($utf8.GetBytes($header + $index + $pkg)); $w.Flush()
    [IO.File]::WriteAllBytes($Asar, $ms.ToArray())
}
function Write-OriginalAsar([string]$Asar) {
    # Discord's own app.asar is megabytes; 70 KB is past the 64 KB cut-off.
    [IO.File]::WriteAllText($Asar, "original " + ("require(`"x`") " * 6000))
}
# ParseDiscord in find_discord_windows.go: the app-* whose full resources
# path is greatest byte by byte, joined with \ as on Windows.
function Get-GoResources([string]$Discord) {
    $best = ""; $bestDir = $null
    foreach ($d in Get-ChildItem -LiteralPath $Discord -Directory) {
        if (-not $d.Name.StartsWith("app-", [StringComparison]::Ordinal)) { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $d.FullName "resources"))) { continue }
        $k = $Discord + "\" + $d.Name + "\resources"
        if ([string]::CompareOrdinal($k, $best) -gt 0) { $best = $k; $bestDir = Join-Path $d.FullName "resources" }
    }
    return $bestDir
}
$script:CliCalls = [System.Collections.Generic.List[string]]::new()
$script:FailFor = @()
function Invoke-FakeCli {
    $action = $args[0]; $location = $args[2]
    $script:CliCalls.Add("$action $(Split-Path $location -Leaf)")
    if ($args[1] -ne "--location" -or $env:VENCORD_USER_DATA_DIR -ne $AitHome -or $env:VENCORD_DEV_INSTALL -ne "1") { throw "bad CLI call: $args" }
    if ((Split-Path $location -Leaf) -in $script:FailFor) { $global:LASTEXITCODE = 1; return }
    $res = Get-GoResources $location
    $asar = Join-Path $res "app.asar"
    # patcher.go joins with path/filepath, so on Windows with backslashes.
    if ($action -eq "--install") { Write-PatchedAsar $asar ($env:VENCORD_USER_DATA_DIR + "\dist\patcher.js") }
    else { Write-OriginalAsar $asar }
    $global:LASTEXITCODE = 0
}

# --- Fake %LOCALAPPDATA% builders.
function New-Profile([string]$Name) {
    $local = Join-Path $Root (Join-Path $Name "AppData/Local")
    if (Test-Path -LiteralPath (Join-Path $Root $Name)) { Remove-Item -LiteralPath (Join-Path $Root $Name) -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $local | Out-Null
    $env:LOCALAPPDATA = $local
    return $local
}
function New-Discord([string]$Folder, [string[]]$Apps = @("app-1.0.9001"), [string]$PatchedTo) {
    $p = Join-Path $env:LOCALAPPDATA $Folder
    foreach ($a in $Apps) {
        $r = Join-Path (Join-Path $p $a) "resources"
        New-Item -ItemType Directory -Force -Path $r | Out-Null
        Write-OriginalAsar (Join-Path $r "app.asar")
    }
    if ($PatchedTo) { Write-PatchedAsar (Join-Path (Get-GoResources $p) "app.asar") $PatchedTo }
    return $p
}
function New-Home([string]$Path) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Path "dist") | Out-Null
    Set-Content -LiteralPath (Join-Path $Path "dist/build.json") -Value '{"build":"old"}'
    Set-Content -LiteralPath (Join-Path $Path "dist/patcher.js") -Value 'x'
}
# Set the script's own variables as its first lines would.
function Set-Homes {
    $script:AitHome = Join-Path $env:LOCALAPPDATA "ai-translate"
    $script:OldHome = Join-Path $env:LOCALAPPDATA "aiTranslate"
    if (-not (Test-Path -LiteralPath $script:OldHome -PathType Container)) { $script:OldHome = $null }
    $script:Dist = Join-Path $script:AitHome "dist"
    $Downloaded.Cli = $false
}
function Reset-Run([object[]]$Answers) {
    $script:Answers.Clear(); foreach ($a in $Answers) { $script:Answers.Enqueue($a) }
    $script:Asked.Clear(); $script:CliCalls.Clear(); $script:CliDownloads = 0; $script:FailFor = @()
}
# Runs like the main try block: a stop is caught and its message kept.
function Invoke-Run([scriptblock]$Body) {
    $script:Stopped = $null
    $script:Out = @(& { try { & $Body } catch [System.OperationCanceledException] { $script:Stopped = $_.Exception.Message } } 6>&1 | ForEach-Object { "$_" })
}
function Get-PatchedTo([string]$Discord) {
    return Get-RequiredPath (Join-Path (Get-GoResources (Join-Path $env:LOCALAPPDATA $Discord)) "app.asar")
}

$script:Pass = 0; $script:Fail = 0
function Check([string]$Name, [bool]$Ok, [string]$Detail = "") {
    if ($Ok) { $script:Pass++; Write-Host "  ok   $Name" }
    else { $script:Fail++; Write-Host "  FAIL $Name $Detail" -ForegroundColor Red }
}
function Check-Done([string]$Case) {
    Check "$Case`: every scripted answer used" ($script:Answers.Count -eq 0) "left: $($script:Answers.Count)"
}
