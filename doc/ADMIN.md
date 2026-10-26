### Who can use the app

By default only members of the `admins` group can open the app. You can allow other users or groups in the YunoHost admin interface (Users > Groups and permissions), but remember that with full access they will be able to modify any file of the server. The app can't be made public.

### Changing the managed folder or the access level

Go to Applications > Server Manager > Configuration in the YunoHost admin interface, or use the command line:

```bash
sudo yunohost app config set __APP__ main.access.root_path -v /var/www
sudo yunohost app config set __APP__ main.access.full_access -v no
```

When full access is disabled, the app runs as the `__APP__` system user. To let it modify some files, give that user access to them, for example by adding it to the right group: `sudo usermod -aG www-data __APP__` then restart the service with `sudo systemctl restart __APP__`.

### Ownership of new files

When running with full access, new files and folders (uploaded, created, copied or extracted) get the owner and group of the folder they are created in, instead of `root`. Edited and overwritten files keep their owner and permissions.

### Protected folders

Essential system folders (`/`, `/etc`, `/usr`, `/var`, `/home`, `/var/www`, `/home/yunohost.app`…) can't be deleted, renamed or moved through the app, as a safety net. Their content can still be managed.

### Audit log

Every change made through the app (uploads, edits, deletions, moves, permission changes…) is logged with the name of the user who made it in `/var/log/__APP__/__APP__.log`.

### Limits

- Files bigger than 10 MiB can't be edited in the browser (download them instead).
- Recursive searches stop after 1000 results or 20 seconds.
