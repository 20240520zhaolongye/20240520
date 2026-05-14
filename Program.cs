using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

class Program {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    static void Main(string[] args) {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string logFile = Path.Combine(exeDir, "launcher.log");
        string nodeExe = @"C:\Program Files\nodejs\node.exe";
        string launcherScript = Path.Combine(exeDir, "launcher.cjs");

        // Logging helper
        Action<string> log = (msg) => {
            File.AppendAllText(logFile, DateTime.Now.ToString("HH:mm:ss") + " " + msg + "\n");
        };

        try {
            log("=== Music Player Launcher Starting ===");
            log("exeDir: " + exeDir);
            log("nodeExe exists: " + File.Exists(nodeExe));
            log("launcher.cjs exists: " + File.Exists(launcherScript));

            if (!File.Exists(nodeExe)) {
                MessageBox(IntPtr.Zero, "Node.js not found!\nPlease install Node.js at C:\\Program Files\\nodejs\\node.exe", "Music Player Error", 0x10);
                return;
            }

            if (!File.Exists(launcherScript)) {
                MessageBox(IntPtr.Zero, "launcher.cjs not found!\nExpected at: " + launcherScript, "Music Player Error", 0x10);
                return;
            }

            // Create a visible console window for debugging
            AllocConsole();

            var psi = new ProcessStartInfo {
                FileName = nodeExe,
                Arguments = "\"" + launcherScript + "\"",
                UseShellExecute = false,
                CreateNoWindow = false,
                WorkingDirectory = exeDir,
            };

            log("Starting Node.js process...");
            var proc = Process.Start(psi);
            proc.WaitForExit();

            log("Node.js exited with code: " + proc.ExitCode);
        }
        catch (Exception ex) {
            log("ERROR: " + ex.Message);
            MessageBox(IntPtr.Zero, "Error: " + ex.Message, "Music Player Error", 0x10);
        }
    }

    [DllImport("kernel32.dll")]
    static extern bool AllocConsole();
}
