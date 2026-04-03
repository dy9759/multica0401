import { execFile } from "node:child_process";
import { platform } from "node:os";

export function sendDesktopNotification(title: string, body: string): void {
  const os = platform();

  try {
    if (os === "darwin") {
      execFile("osascript", [
        "-e",
        `display notification "${escapeAppleScript(body)}" with title "${escapeAppleScript(title)}"`,
      ]);
    } else if (os === "linux") {
      execFile("notify-send", [title, body]);
    } else if (os === "win32") {
      execFile("powershell", [
        "-Command",
        `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); ` +
        `$n = New-Object System.Windows.Forms.NotifyIcon; ` +
        `$n.Icon = [System.Drawing.SystemIcons]::Information; ` +
        `$n.Visible = $true; ` +
        `$n.ShowBalloonTip(5000, '${title.replace(/'/g, "''")}', '${body.replace(/'/g, "''")}', 'Info')`,
      ]);
    }
  } catch {
    // Silently ignore notification failures
  }
}

function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
