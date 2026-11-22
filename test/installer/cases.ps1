# install/install.ps1 under real PowerShell: parsed, held to Windows
# PowerShell 5.1's syntax, and its functions run against a fake
# %LOCALAPPDATA%. Run through test/installer.mjs.
#
# On Linux, Join-Path writes / and the disk tells case apart. What is decided
# on strings (the app-* chosen, the path read from app.asar, a path inside a
# folder in any case, the menu) holds for Windows; what touches the disk
# shows the logic only.
param([string]$ScriptPath, [string]$Root)

# irm | iex runs it in the stock Windows PowerShell 5.1, which the 7.x parser
# used here would not hold it to.
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
$newer = @($ast.FindAll({ param($n)
    $n -is [System.Management.Automation.Language.TernaryExpressionAst] -or
    $n -is [System.Management.Automation.Language.PipelineChainAst] -or
    ($n -is [System.Management.Automation.Language.MemberExpressionAst] -and $n.NullConditional) -or
    ($n -is [System.Management.Automation.Language.IndexExpressionAst] -and $n.NullConditional) -or
    ($n -is [System.Management.Automation.Language.BinaryExpressionAst] -and $n.Operator -eq "QuestionQuestion") -or
    ($n -is [System.Management.Automation.Language.AssignmentStatementAst] -and $n.Operator -eq "QuestionQuestionEquals") -or
    ($n -is [System.Management.Automation.Language.PipelineAst] -and $n.Background) -or
    ($n -is [System.Management.Automation.Language.ScriptBlockAst] -and $n.CleanBlock)
}, $true))
$newer += @($tokens | Where-Object { $_.Kind -in "QuestionQuestion", "QuestionQuestionEquals", "QuestionDot", "QuestionLBracket", "AndAnd", "OrOr", "QuestionMark" })
Write-Host "Syntax"
if ($errors.Count) {
    $errors | ForEach-Object { Write-Host "  FAIL line $($_.Extent.StartLineNumber): $($_.Message)" -ForegroundColor Red }
    exit 1
}

. (Join-Path $PSScriptRoot "harness.ps1") -ScriptPath $ScriptPath -Root $Root
Check "parses with no errors" $true
Check "nothing newer than Windows PowerShell 5.1" ($newer.Count -eq 0) (($newer | ForEach-Object { "line $($_.Extent.StartLineNumber): $($_.Extent.Text)" }) -join "; ")

# A profile name with Cyrillic and &, which json.Marshal writes as \u0026.
$Profile = "Пётр & Co"

function Case([string]$Name, [scriptblock]$Body) {
    Write-Host "$Name"
    try { & $Body } catch { Check "$Name`: ran without an unexpected error" $false "$($_.Exception.Message) @ $($_.InvocationInfo.ScriptLineNumber)" }
}

Case "0. the fake CLI writes app.asar as Vencord's does" {
    New-Profile $Profile | Out-Null; Set-Homes; Reset-Run @()
    New-Item -ItemType Directory -Force -Path $AitHome | Out-Null
    $d = New-Discord "Discord"
    Invoke-VencordInstaller "--install" $d "Patching Discord failed."
    Check "fake CLI ran" ($script:CliCalls.Count -eq 1) "$($script:CliCalls)"
    Check "asar decoded back to AitHome\dist\patcher.js" ((Get-PatchedTo "Discord") -eq ($AitHome + "\dist\patcher.js")) "$(Get-PatchedTo 'Discord')"
    $raw = [IO.File]::ReadAllText((Join-Path (Get-GoResources $d) "app.asar"))
    Check "asar holds & as \u0026, as json.Marshal writes it" ($raw.Contains('\' + 'u0026') -and -not $raw.Contains('& Co'))
}

Case "1. no Discord: the menu is only Another folder" {
    New-Profile $Profile | Out-Null; Set-Homes; Reset-Run @(0)
    Check "Get-Discords finds none" (@(Get-Discords).Count -eq 0)
    $script:Typed = ""
    Invoke-Run { Select-Discord "Which Discord should be patched?" }
    $opts = $script:Asked[0].Options
    Check "options are exactly 'Another folder'" ($opts.Count -eq 1 -and $opts[0] -eq "Another folder") "[$($opts -join '|')] count=$($opts.Count)"
    Check "nothing typed stops" ($script:Stopped -eq "Nothing was typed, so nothing was changed.") $script:Stopped
}

Case "2. a version folder without app-*\resources is not listed" {
    New-Profile $Profile | Out-Null; Set-Homes; Reset-Run @()
    New-Item -ItemType Directory -Force -Path (Join-Path $env:LOCALAPPDATA "Discord/app-1.0.1") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $env:LOCALAPPDATA "DiscordPTB/resources") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $env:LOCALAPPDATA "DiscordDevelopment/App-1.0.1/resources") | Out-Null
    New-Discord "DiscordCanary" | Out-Null
    $labels = @(Get-Discords | ForEach-Object Label)
    Check "only Canary listed" ($labels.Count -eq 1 -and $labels[0] -eq "Canary") "[$($labels -join '|')]"
    $script:Answers.Enqueue(0)
    Invoke-Run { $script:Picked = Select-Discord "Which Discord should be patched?" }
    Check "menu: Canary, Another folder" (($script:Asked[0].Options -join '|') -eq "Canary|Another folder") ($script:Asked[0].Options -join '|')
    Check "picking it returns its folder" ($script:Picked -eq (Join-Path $env:LOCALAPPDATA "DiscordCanary")) $script:Picked
}

Case "3. app-1.0.9 against app-1.0.90 and app-1.0.10" {
    New-Profile $Profile | Out-Null; Set-Homes; Reset-Run @()
    New-Discord "Discord" @("app-1.0.90", "app-1.0.9", "app-1.0.10") | Out-Null
    $asar = @(Get-Discords)[0].Asar
    Check "app-1.0.9 is the one, as Go picks" ($asar -eq (Join-Path (Join-Path $env:LOCALAPPDATA "Discord/app-1.0.9/resources") "app.asar")) $asar
    Check "and agrees with the fake Go rule" ((Split-Path $asar) -eq (Get-GoResources (Join-Path $env:LOCALAPPDATA "Discord")))
    Check "one Discord is one line" (@(Get-Discords).Count -eq 1)
}

function New-OldSetup([string[]]$OnOld, [string[]]$Others = @()) {
    $local = New-Profile $Profile
    New-Home (Join-Path $local "aiTranslate")
    $old = Join-Path $local "aiTranslate"
    foreach ($f in $OnOld) { New-Discord $f -PatchedTo ($old + "\dist\patcher.js") | Out-Null }
    foreach ($f in $Others) { New-Discord $f | Out-Null }
    Set-Homes
}

Case "4. two Discords on the old folder, one picked, Yes" {
    New-OldSetup @("Discord", "DiscordPTB")
    Reset-Run @(0, 0)
    Invoke-Run { Install-AiTranslate }
    Check "not stopped" (-not $script:Stopped) $script:Stopped
    Check "question is singular" ($script:Asked[1].Title -eq "Patch that Discord too?") $script:Asked[1].Title
    Check "menu was Stable, PTB, Another folder" (($script:Asked[0].Options -join '|') -eq "Stable|PTB|Another folder")
    Check "names PTB" ($script:Out -contains "  PTB") ($script:Out -join ' / ')
    Check "both patched to the new folder" ((Get-PatchedTo "Discord") -eq "$AitHome\dist\patcher.js" -and (Get-PatchedTo "DiscordPTB") -eq "$AitHome\dist\patcher.js")
    Check "old folder deleted" (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "aiTranslate")))
    Check "CLI downloaded once, run twice" ($script:CliDownloads -eq 1 -and $script:CliCalls.Count -eq 2) "$script:CliDownloads / $($script:CliCalls -join ',')"
    Check "Done printed" ($script:Out -contains "Done. Start Discord again.")
    Check-Done "4"
}

Case "5. the same, No" {
    New-OldSetup @("Discord", "DiscordPTB")
    Reset-Run @(0, 1)
    Invoke-Run { Install-AiTranslate }
    $old = Join-Path $env:LOCALAPPDATA "aiTranslate"
    Check "stops with the kept line" ($script:Stopped -eq "So $old is kept. Run this again and patch that Discord too.") $script:Stopped
    Check "old folder kept" (Test-Path -LiteralPath $old)
    Check "PTB still on the old folder" ((Get-PatchedTo "DiscordPTB") -eq "$old\dist\patcher.js")
    Check "Stable moved" ((Get-PatchedTo "Discord") -eq "$AitHome\dist\patcher.js")
    Check-Done "5"
    # The next run: OldHome is still there, so it moves again.
    Set-Homes; Reset-Run @(1)
    Invoke-Run { Install-AiTranslate }
    Check "rerun: picks PTB, nothing more asked, folder gone" (-not $script:Stopped -and $script:Asked.Count -eq 1 -and -not (Test-Path -LiteralPath $old)) "$script:Stopped / $($script:Asked.Count)"
    Check-Done "5 rerun"
}

Case "6. three on the old folder: plural question" {
    New-OldSetup @("Discord", "DiscordPTB", "DiscordCanary")
    Reset-Run @(0, 0)
    Invoke-Run { Install-AiTranslate }
    Check "plural" ($script:Asked[1].Title -eq "Patch those Discords too?") $script:Asked[1].Title
    Check "names PTB and Canary" (($script:Out -contains "  PTB") -and ($script:Out -contains "  Canary"))
    Check "all three moved" (@("Discord", "DiscordPTB", "DiscordCanary" | Where-Object { (Get-PatchedTo $_) -eq "$AitHome\dist\patcher.js" }).Count -eq 3)
    Check "old folder deleted" (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "aiTranslate")))
    Check "CLI once, three runs" ($script:CliDownloads -eq 1 -and $script:CliCalls.Count -eq 3)
    Check-Done "6"
}

Case "7. none left: nothing asked" {
    New-OldSetup @("Discord") @("DiscordPTB")
    Reset-Run @(0)
    Invoke-Run { Install-AiTranslate }
    Check "one question only" ($script:Asked.Count -eq 1) "$($script:Asked.Count)"
    Check "old folder deleted" (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "aiTranslate")))
    Check "not stopped" (-not $script:Stopped) $script:Stopped
    Check-Done "7"
}

Case "8. the second patch fails: folder kept" {
    New-OldSetup @("Discord", "DiscordPTB")
    Reset-Run @(0, 0); $script:FailFor = @("DiscordPTB")
    Invoke-Run { Install-AiTranslate }
    Check "stops with the failure" ($script:Stopped -eq "Patching Discord failed.") $script:Stopped
    Check "old folder kept" (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA "aiTranslate"))
    Check-Done "8"
}

Case "8b. the second patch exits 0 but does nothing: Stop-WhileLoaded keeps the folder" {
    New-OldSetup @("Discord", "DiscordPTB")
    Reset-Run @(0, 0)
    # A CLI that says success without writing anything for PTB.
    $orig = ${function:Invoke-FakeCli}
    ${function:script:Invoke-FakeCliReal} = $orig
    ${function:script:Invoke-FakeCli} = { if ((Split-Path $args[2] -Leaf) -eq "DiscordPTB") { $script:CliCalls.Add("silent"); $global:LASTEXITCODE = 0 } else { Invoke-FakeCliReal @args } }
    Invoke-Run { Install-AiTranslate }
    ${function:script:Invoke-FakeCli} = $orig
    $old = Join-Path $env:LOCALAPPDATA "aiTranslate"
    Check "stops with the kept line" ($script:Stopped -eq "So $old is kept. Run this again and patch that Discord too.") $script:Stopped
    Check "old folder kept" (Test-Path -LiteralPath $old)
    Check-Done "8b"
}

Case "9. the first installer's layout, AitHome\Vencord" {
    $local = New-Profile $Profile
    $ait = Join-Path $local "ai-translate"
    New-Home $ait
    New-Item -ItemType Directory -Force -Path (Join-Path $ait "Vencord/dist") | Out-Null
    New-Discord "Discord" -PatchedTo ($ait + "\Vencord\dist\patcher.js") | Out-Null
    New-Discord "DiscordPTB" -PatchedTo ($ait + "\Vencord\dist\patcher.js") | Out-Null
    New-Discord "DiscordCanary" -PatchedTo ($ait + "\dist\patcher.js") | Out-Null
    Set-Homes; Reset-Run @(0, 0)
    Invoke-Run { Install-AiTranslate }
    Check "not stopped" (-not $script:Stopped) $script:Stopped
    Check "asks about PTB only, singular" ($script:Asked[1].Title -eq "Patch that Discord too?" -and ($script:Out -contains "  PTB") -and -not ($script:Out -contains "  Canary")) ($script:Out -join ' / ')
    Check "Vencord folder deleted, AitHome kept" (-not (Test-Path -LiteralPath (Join-Path $ait "Vencord")) -and (Test-Path -LiteralPath $ait))
    Check-Done "9"
}

Case "9b. the first installer's layout inside the old folder" {
    $local = New-Profile $Profile
    $oldHome = Join-Path $local "aiTranslate"
    New-Item -ItemType Directory -Force -Path (Join-Path $oldHome "Vencord/dist") | Out-Null
    New-Discord "Discord" -PatchedTo ($oldHome + "\Vencord\dist\patcher.js") | Out-Null
    New-Discord "DiscordPTB" -PatchedTo ($oldHome + "\Vencord\dist\patcher.js") | Out-Null
    Set-Homes; Reset-Run @(0, 0)
    Invoke-Run { Install-AiTranslate }
    Check "not stopped" (-not $script:Stopped) $script:Stopped
    Check "asked about PTB" ($script:Asked.Count -eq 2 -and ($script:Out -contains "  PTB"))
    Check "old folder deleted" (-not (Test-Path -LiteralPath $oldHome))
    Check "both on the new folder" ((Get-PatchedTo "Discord") -eq "$AitHome\dist\patcher.js" -and (Get-PatchedTo "DiscordPTB") -eq "$AitHome\dist\patcher.js")
    Check-Done "9b"
}

Case "10. case differences and a sibling aiTranslate2" {
    $local = New-Profile $Profile
    $old = Join-Path $local "aiTranslate"
    New-Home $old
    New-Discord "Discord" | Out-Null
    # What Windows treats as the same folder, written in other case and with /.
    New-Discord "DiscordPTB" -PatchedTo ($old.ToUpperInvariant().Replace('/', '\') + "\DIST\patcher.js") | Out-Null
    New-Discord "DiscordCanary" -PatchedTo ((Join-Path $local "aiTranslate2") + "\dist\patcher.js") | Out-Null
    Set-Homes
    $left = @(Get-DiscordLoadingFrom $old | ForEach-Object Label)
    Check "upper-case path counts, sibling does not" (($left -join '|') -eq "PTB") ($left -join '|')
    Check "Test-Inside: folder itself with a slash at the end" (Test-Inside "$old\x" "$old/")
    Check "Test-Inside: the folder alone is not inside itself" (-not (Test-Inside "$old" "$old"))
    Reset-Run @(0, 0)
    Invoke-Run { Install-AiTranslate }
    Check "PTB patched, Canary untouched" ((Get-PatchedTo "DiscordPTB") -eq "$AitHome\dist\patcher.js" -and (Get-PatchedTo "DiscordCanary") -like "*aiTranslate2\dist\patcher.js")
    Check "old folder deleted" (-not (Test-Path -LiteralPath $old))
    Check-Done "10"
}

Case "11. Get-RequiredPath on odd paths" {
    New-Profile $Profile | Out-Null
    $f = Join-Path $env:LOCALAPPDATA "t.asar"
    foreach ($p in @('C:\Users\Пётр & Co <x>\AppData\Local\ai-translate\dist\patcher.js', 'C:\Users\a"b\dist\patcher.js', 'D:/mixed\slashes/patcher.js')) {
        Write-PatchedAsar $f $p
        $raw = [IO.File]::ReadAllText($f)
        Check "decodes $p" ((Get-RequiredPath $f) -eq $p -and -not ($raw -match '[<>&]')) (Get-RequiredPath $f)
    }
    Write-OriginalAsar $f
    Check "Discord's own app.asar is not read" ($null -eq (Get-RequiredPath $f))
    Check "a missing file is null" ($null -eq (Get-RequiredPath (Join-Path $env:LOCALAPPDATA "none.asar")))
    New-Item -ItemType Directory -Path (Join-Path $env:LOCALAPPDATA "dir.asar") | Out-Null
    Check "a folder is null" ($null -eq (Get-RequiredPath (Join-Path $env:LOCALAPPDATA "dir.asar")))
}

Case "12. remove one of two, delete Yes, then the other" {
    $local = New-Profile $Profile
    $ait = Join-Path $local "ai-translate"
    New-Home $ait
    New-Discord "Discord" -PatchedTo ($ait + "\dist\patcher.js") | Out-Null
    New-Discord "DiscordPTB" -PatchedTo ($ait + "\dist\patcher.js") | Out-Null
    Set-Homes; Reset-Run @(0, 1)
    Invoke-Run { Remove-AiTranslate }
    Check "stops with the remove line" ($script:Stopped -eq "So $ait is kept. Run this again and remove the patch from that Discord too.") $script:Stopped
    Check "names PTB" ($script:Out -contains "  PTB")
    Check "files kept" (Test-Path -LiteralPath $ait)
    Check "Stable unpatched" ($null -eq (Get-PatchedTo "Discord"))
    Check-Done "12a"
    Set-Homes; Reset-Run @(1, 1)
    Invoke-Run { Remove-AiTranslate }
    Check "second run not stopped" (-not $script:Stopped) $script:Stopped
    Check "deleted" (-not (Test-Path -LiteralPath $ait) -and ($script:Out -contains "Deleted $ait."))
    Check "CLI downloaded once in that run" ($script:CliDownloads -eq 1)
    Check-Done "12b"
}

Case "13. remove with the old folder still loaded by another Discord" {
    $local = New-Profile $Profile
    $ait = Join-Path $local "ai-translate"; $old = Join-Path $local "aiTranslate"
    New-Home $ait; New-Home $old
    New-Discord "Discord" -PatchedTo ($ait + "\dist\patcher.js") | Out-Null
    New-Discord "DiscordPTB" -PatchedTo ($old + "\dist\patcher.js") | Out-Null
    Set-Homes; Reset-Run @(0, 1)
    Invoke-Run { Remove-AiTranslate }
    Check "stops naming the old folder" ($script:Stopped -eq "So $old is kept. Run this again and remove the patch from that Discord too.") $script:Stopped
    Check "both folders kept" ((Test-Path -LiteralPath $ait) -and (Test-Path -LiteralPath $old))
    Check-Done "13"
}

Case "14. remove a copy never moved out of the old folder" {
    $local = New-Profile $Profile
    $old = Join-Path $local "aiTranslate"
    New-Home $old
    New-Discord "Discord" -PatchedTo ($old + "\dist\patcher.js") | Out-Null
    Set-Homes
    # As the main block does.
    if ($OldHome -and -not (Test-Path $AitHome)) { $script:AitHome = $OldHome; $script:OldHome = $null }
    Reset-Run @(0, 1)
    Invoke-Run { Remove-AiTranslate }
    Check "deleted" (-not $script:Stopped -and -not (Test-Path -LiteralPath $old)) $script:Stopped
    Check-Done "14"
}

Write-Host ""
Write-Host "$script:Pass passed, $script:Fail failed"
exit ([int]($script:Fail -gt 0))
