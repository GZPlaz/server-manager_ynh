#!/bin/bash

#=================================================
# COMMON VARIABLES AND CUSTOM HELPERS
#=================================================

# Exit with an error if the folder to manage is not usable.
_validate_root_path() {
    if [[ ! "$root_path" =~ ^/ ]] || [[ "$root_path" =~ [\"\\%] ]] || [[ "$root_path" == *$'\n'* ]]; then
        ynh_die "The folder to manage must be an absolute path, without quotes, backslashes or % characters (got '$root_path')"
    fi
    if [ ! -d "$root_path" ]; then
        ynh_die "The folder '$root_path' does not exist"
    fi
}

_is_true() {
    case "$1" in
        1 | true | True | yes) return 0 ;;
        *) return 1 ;;
    esac
}

# Define the variables used in the systemd template:
# the system user the service runs as, and whether the terminal is enabled.
_set_run_user() {
    if _is_true "${full_access:-1}"; then
        run_user="root"
    else
        run_user="$app"
    fi
    if _is_true "${terminal:-1}"; then
        terminal_enabled=1
    else
        terminal_enabled=0
    fi
}

# Deploy the application code shipped in this package.
# The code is owned by root so that the service can't modify itself
# when it doesn't run with full access.
_install_app_files() {
    ynh_safe_rm "$install_dir/static"
    mkdir -p "$install_dir/static"
    cp "$YNH_APP_BASEDIR/sources/server.py" "$YNH_APP_BASEDIR/sources/terminal.py" "$install_dir/"
    cp -r "$YNH_APP_BASEDIR/sources/static/." "$install_dir/static/"
    chown -R "root:$app" "$install_dir"
    chmod -R u=rwX,g=rX,o= "$install_dir"
}
