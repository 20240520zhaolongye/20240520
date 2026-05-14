using System;
using System.IO;
using System.Runtime.InteropServices;
using IWshRuntimeLibrary;

class CreateShortcut {
    static void Main() {
        string exePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "musicplayer", "MusicPlayer.exe");
        string shortcutPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Music Player.lnk");

        WshShell shell = new WshShell();
        IWshShortcut shortcut = (IWshShortcut)shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = exePath;
        shortcut.WorkingDirectory = Path.GetDirectoryName(exePath);
        shortcut.Description = "Music Player - Desktop Client";
        shortcut.IconLocation = Path.Combine(Path.GetDirectoryName(exePath), "frontend", "electron", "icons", "icon.ico") + ",0";
        shortcut.Save();

        Console.WriteLine("Shortcut created at: " + shortcutPath);
    }
}
