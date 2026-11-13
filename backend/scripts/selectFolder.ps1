[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select RentTrack System Backup Storage Folder"
$dialog.ShowNewFolderButton = $true

if ($args.Count -gt 0 -and $args[0]) {
    $initialPath = $args[0].Trim('"')
    if (Test-Path $initialPath) {
        $dialog.SelectedPath = (Resolve-Path $initialPath).Path
    }
}

# Create a topmost dummy window to ensure dialog opens in the foreground
$dummy = New-Object System.Windows.Forms.Form
$dummy.TopMost = $true
$dummy.StartPosition = "Manual"
$dummy.Location = New-Object System.Drawing.Point(-32000, -32000)
$dummy.Size = New-Object System.Drawing.Size(1, 1)
$dummy.Opacity = 0
$dummy.Show()
$dummy.BringToFront()

$result = $dialog.ShowDialog($dummy)
$dummy.Close()
$dummy.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::WriteLine($dialog.SelectedPath)
} else {
    [Console]::WriteLine("")
}
