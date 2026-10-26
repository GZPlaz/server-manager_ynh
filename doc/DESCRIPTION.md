Server Manager is a web file manager and terminal for your YunoHost server: everything you would do with an SFTP client like FileZilla or an SSH client, directly from your browser, behind the YunoHost single sign-on.

### Features

- Browse the server with a folder tree, an address bar, bookmarks, back/forward navigation and sortable columns (size, date, permissions, owner)
- Upload files and whole folders (button or drag & drop from your desktop), with a transfer queue showing progress and speed, and a "file already exists" prompt (overwrite / keep both / skip)
- Download files, or folders and multiple selections as a zip archive
- Edit text and configuration files in the browser: line numbers, auto-indent, tab/shift-tab indentation, Ctrl+S to save, detection of changes made by someone else in the meantime, and preservation of the file's encoding, line endings, permissions and owner
- Create, rename, copy, cut/paste, move (drag & drop) and delete files and folders
- Change permissions (chmod, with a FileZilla-like dialog, optionally recursive) and owner/group (chown)
- Compress to zip, extract zip and tar archives
- Filter the current folder or search recursively by name (wildcards supported)
- Preview images
- Keyboard shortcuts (Enter, Backspace, Delete, F2, F5, Ctrl+A/C/X/V…), right-click menus, light and dark themes, works on mobile
- A web terminal to run commands like over SSH (nano, htop, vim… work), with "Open terminal here" on any folder and special keys for tablets
- Every change is recorded in an audit log (`/var/log/server-manager/server-manager.log`) with the name of the user who made it
- No external dependency to install: a small Python standard library backend and a plain JavaScript frontend (xterm.js is bundled for the terminal)
