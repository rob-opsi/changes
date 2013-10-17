#!/usr/bin/env python


def _get_or_create_server_project():
    from changes.models import Repository, Project
    from changes.config import db

    try:
        repo = Repository.query.filter_by(
            url='http://example.com/server',
        )[0]
    except IndexError:
        repo = Repository(
            url='http://example.com/server',
        )
        db.session.add(repo)

    try:
        project = Project.query.filter_by(
            repository=repo,
            name='Server',
        )[0]
    except IndexError:
        project = Project(
            repository=repo,
            name='Server',
        )
        db.session.add(project)

    return project


def web():
    from gevent import wsgi
    from changes.config import create_app

    print "Listening on http://0.0.0.0:5000"

    app = create_app()
    wsgi.WSGIServer(('0.0.0.0', 5000), app).serve_forever()


def poller():
    jenkins_poller()


def jenkins_poller():
    import time
    from changes.config import create_app, db
    from changes.backends.jenkins.builder import JenkinsBuilder

    app = create_app()
    app_context = app.app_context()
    app_context.push()

    from changes.models import RemoteEntity, EntityType

    project = _get_or_create_server_project()

    try:
        entity = RemoteEntity.query.filter_by(
            provider='jenkins',
            remote_id='server',
            type=EntityType.project,
        )[0]
    except IndexError:
        entity = RemoteEntity(
            provider='jenkins',
            remote_id='server',
            internal_id=project.id,
            type=EntityType.project,
        )
        db.session.add(entity)

    project.attach_entity(entity)

    print "Polling for builds"
    builder = JenkinsBuilder(app=app, base_url='https://jenkins.build.itc.dropbox.com')
    while True:
        builder.sync_build_list(project)
        time.sleep(5)


def phabricator_poller():
    import time
    from changes.config import create_app, db
    from changes.backends.phabricator.poller import PhabricatorPoller
    from changes.models import RemoteEntity, EntityType
    from phabricator import Phabricator

    app = create_app()
    app_context = app.app_context()
    app_context.push()

    project = _get_or_create_server_project()

    try:
        RemoteEntity.query.filter_by(
            provider='phabricator',
            remote_id='Server',
            type=EntityType.project,
        )[0]
    except IndexError:
        entity = RemoteEntity(
            provider='phabricator',
            remote_id='Server',
            internal_id=project.id,
            type=EntityType.project,
        )
        db.session.add(entity)

    print "Polling for changes"
    client = Phabricator(host='https://tails.corp.dropbox.com/api/')
    poller = PhabricatorPoller(client)
    poller._populate_project_cache()
    while True:
        for project, revision in poller._yield_revisions():
            poller.sync_revision(project, revision)
            db.session.commit()
        time.sleep(5)
