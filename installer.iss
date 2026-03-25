[Setup]
AppName=PlayFool
AppVersion={#MyAppVersion}
AppPublisher=PullFool
AppPublisherURL=https://github.com/PullFool/PlayFool
DefaultDirName={autopf}\PlayFool
DefaultGroupName=PlayFool
OutputBaseFilename=PlayFool-Setup
OutputDir=.
Compression=lzma2
SolidCompression=yes
SetupIconFile=public\icon.ico
UninstallDisplayIcon={app}\PlayFool.exe
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\PlayFool"; Filename: "{app}\PlayFool.exe"; Parameters: "--user-data-dir=""{localappdata}\PlayFool\nw-data"""
Name: "{group}\Uninstall PlayFool"; Filename: "{uninstallexe}"
Name: "{autodesktop}\PlayFool"; Filename: "{app}\PlayFool.exe"; Parameters: "--user-data-dir=""{localappdata}\PlayFool\nw-data"""; Tasks: desktopicon

[Run]
Filename: "{app}\PlayFool.exe"; Parameters: "--user-data-dir=""{localappdata}\PlayFool\nw-data"""; Description: "Launch PlayFool"; Flags: nowait postinstall skipifsilent
