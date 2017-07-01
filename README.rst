Changes
-------

This project is a fork of Dropbox's Changes endeavor (which is no longer maintained). It's a work in progress and not yet functional.

Screenshot
==========

.. image:: https://github.com/getsentry/changes/raw/master/docs/images/example.png

Getting Started
===============

TODO: make docs better, for now, do this:

```bash
mkvirtualenv changes
make develop
createdb -E utf-8 changes
make upgrade
mkdir -p ~/.changes/repos
```

Create the configuration file at `~/.changes/changes.conf.py`

```python
# ~/.changes/changes.conf.py
WEB_BASE_URI = 'http://localhost:5000'
INTERNAL_BASE_URI = 'http://localhost:5000'
SERVER_NAME = 'localhost:5000'

REPO_ROOT = '~/.changes/repos'

# You can obtain these values via the Google Developers Console:
# https://console.developers.google.com/
# Example 'Authorized JavaScript Origins': http://localhost:5000/
# Example 'Authorized Redirect URIs': http://localhost:5000/auth/complete/
GOOGLE_CLIENT_ID = 'ask cramer or fill this in'
GOOGLE_CLIENT_SECRET = 'ask cramer or fill this in'
GOOGLE_DOMAIN = None
```

Create a repository to get things going:

```shell
bin/repos add --url git@github.com:getsentry/changes.git --backend git
bin/projects add --label changes --repo-url git@github.com:getsentry/changes.git --slug changes
```

Load the development server:

```shell
bin/devserver --workers
```
