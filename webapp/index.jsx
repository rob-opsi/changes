import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import URI from 'urijs';

import * as data_fetching from './server/api';
import custom_content_hook from './utils/custom_content';
import {setPageTitle} from './utils/utils';
import ChangesLinks from './display/changes/links';
import HomePage from './pages/home_page';
import AdminPage from './pages/admin_page';
import AdminProjectPage from './pages/admin_project_page';
import AdminRepositoryPage from './pages/admin_repository_page';
import InfraFailsPage from './pages/infra_fails_page';
import TaskTreePage from './pages/task_tree_page';
import JobstepSummaryPage from './pages/jobstep_summary_page';
import ProjectPage from './pages/project_page/project_page';
import AuthorBuildsPage from './pages/author_builds_page';
import {CommitPage, DiffPage, SingleBuildPage} from './pages/builds_pages/builds_pages';
import {BuildTestsPage, SingleBuildTestPage} from './pages/tests_for_build_page';
import TestHistoryPage from './pages/test_history_page';
import LogPage from './pages/log_page';
import AllProjectsPage from './pages/all_projects_page';
import NodePage from './pages/node_page';
import SnapshotPage from './pages/snapshot_page';
import CodePage from './pages/code_page';
import PusherPage from './pages/pusher_page';
import DisplayExamplesPage from './pages/examples_page';
import FourOhFourPage from './pages/fourohfour_page';

// routing
// TODO: all of this is terrible and temporary just to get something working.
// replace with a routing library. Probably not react-router, though... its
// too template-y. Or at least don't use nesting with react-router
// TODO(dcramer): ^^ lies, react-router is fine (but use the version sentry
// uses, not the new stuff)

var path = window.location.pathname;
var path_parts = _.compact(path.split('/'));

// Strip the leading /v2/ if it exists
if (path_parts[0] == 'v2') {
  path_parts.shift();
}

// We want to ensure that certain changes classic style links still work.
if (path_parts.length > 3 && path_parts[0] === 'projects' && path_parts[2] == 'builds') {
  var build_id = path_parts[3];
  if (path_parts.indexOf('tests') > 3) path_parts = ['build_tests', build_id];
  else if (path_parts.length == 8 && path_parts[4] == 'jobs' && path_parts[6] == 'logs')
    // for /projects/<slug>/builds/<build_id>/jobs/<job_id>/logs/<log_id>
    path_parts = ['job_log', build_id, path_parts[5], path_parts[7]];
  else path_parts = ['find_build', build_id];
}

var redirect_to_build = function(build_id) {
  var build_redirect_func = function(response, was_success) {
    if (!was_success) {
      document.write('Redirect failed');
      return;
    }

    var build = JSON.parse(response.responseText);
    window.location.href = URI(ChangesLinks.buildHref(build));
  };

  data_fetching.make_api_ajax_get(
    '/api/0/builds/' + build_id,
    null,
    build_redirect_func,
    build_redirect_func
  );
};

var redirect_to_node = function(node_hostname) {
  var node_redirect_func = function(response, was_success) {
    if (!was_success) {
      document.write('Redirect failed');
      return;
    }

    var node = JSON.parse(response.responseText);
    var new_href = URI('/node/' + node.id + '/');
    window.location.href = new_href;
  };

  data_fetching.make_api_ajax_get(
    '/api/0/nodes/hostname/' + node_hostname,
    null,
    node_redirect_func,
    node_redirect_func
  );
};

var redirect_to_jobstep = function(jobstep_id) {
  var jobstep_redirect_func = function(response, was_success) {
    if (!was_success) {
      document.write('Redirect failed');
      return;
    }

    var jobstep = JSON.parse(response.responseText);
    redirect_to_build(jobstep.job.build.id);
  };

  data_fetching.make_api_ajax_get(
    '/api/0/jobsteps/' + jobstep_id,
    null,
    jobstep_redirect_func,
    jobstep_redirect_func
  );
};

function route() {
  if (path_parts[0] === 'find_build') {
    redirect_to_build(path_parts[1]);
    return;
  } else if (path_parts[0] === 'find_jobstep') {
    redirect_to_jobstep(path_parts[1]);
    return;
  } else if (path_parts[0] === 'find_node') {
    redirect_to_node(path_parts[1]);
    return;
  }

  var url_contains = {
    projects: [AllProjectsPage],
    project: [ProjectPage, 'projectSlug'],
    author_builds: [AuthorBuildsPage, 'author'],
    commit_source: [CommitPage, 'sourceUUID'],
    diff: [DiffPage, 'diff_id'],
    single_build: [SingleBuildPage, 'buildID'],
    build_test: [SingleBuildTestPage, 'buildID', 'testID'],
    build_tests: [BuildTestsPage, 'buildID'],
    project_test: [TestHistoryPage, 'projectUUID', 'testHash'],
    job_log: [LogPage, 'buildID', 'jobID', 'logsourceID'],
    author: [HomePage, 'author'], // TODO: don't just use the homepage
    node: [NodePage, 'nodeID'],
    snapshot: [SnapshotPage, 'snapshotID'],
    infra_fails: [InfraFailsPage],
    task_tree: [TaskTreePage, 'objectID'],
    jobstep_summary: [JobstepSummaryPage],
    code: [CodePage, 'sourceID'],
    pusher: [PusherPage],
    display_examples: [DisplayExamplesPage],
    admin: [AdminPage],
    admin_project: [AdminProjectPage, 'projectSlug'],
    admin_repository: [AdminRepositoryPage, 'repositoryID']
  };

  var page = FourOhFourPage;

  // Redirect projects/foo -> project/foo because
  // v1 project pages used the plural form
  if (path_parts[0] === 'projects' && path_parts.length > 1) {
    path_parts[0] = 'project';
  }

  var params = {};
  for (var str in url_contains) {
    if (path_parts[0] === str) {
      var page_data = url_contains[str];
      page = page_data[0];
      if (page_data.length > 1) {
        if (path_parts.length < page_data.length) {
          // path doesn't have enough parts...
          page = FourOhFourPage;
          params['badUrl'] = true;
          break;
        }
        for (var i = 1; i < page_data.length; i++) {
          params[page_data[i]] = path_parts[i];
        }
      }
      break;
    }
  }

  if (path_parts.length === 0) {
    page = HomePage;
  }

  // we fetch some initial data used by pages (e.g. are we logged in?)
  data_fetching.make_api_ajax_get('/api/0/initial/', null, function(response) {
    var parsedResponse = JSON.parse(response.responseText);

    // TODO: use context?
    window.changesAuthData = parsedResponse['auth'];
    window.changesMessageData = parsedResponse['admin_message'];

    // require user to be logged in
    if (!window.changesAuthData || !window.changesAuthData.user) {
      // disabled on the project page for now so that people can create
      // dashboards
      var unauthOKPages = ['project', 'pusher'];
      var unauthOK = _.any(unauthOKPages, function(path) {
        return path_parts[0] === path;
      });

      if (!unauthOK) {
        // if WEBAPP_USE_ANOTHER_HOST, we can't redirect to login. Tell the
        // user to do it themselves
        if (window.changesGlobals['USE_ANOTHER_HOST']) {
          document.getElementById('reactRoot').innerHTML =
            '<div>' +
            'We want to redirect you to login, but API calls are using ' +
            'a different server (WEBAPP_USE_ANOTHER_HOST). Go to that ' +
            'server and log in.' +
            '</div>';
          return;
        }

        var current_location = encodeURIComponent(window.location.href);
        var login_href = '/auth/login/?orig_url=' + current_location;

        console.log('User not identified - redirecting to login');
        window.location.href = login_href;
        return;
      }
    }

    // add custom css class if present
    var custom_css = custom_content_hook('rootClass', '');
    var root_classes = ('reactRoot ' +
      (document.getElementById('reactRoot').className || '') +
      ' ' +
      custom_css).trim();
    document.getElementById('reactRoot').className = root_classes;

    var pageElem = ReactDOM.render(
      React.createElement(page, params),
      document.getElementById('reactRoot')
    );

    var initialTitle = pageElem.getInitialTitle && pageElem.getInitialTitle();

    if (initialTitle) {
      setPageTitle(initialTitle);
    }
  });
}

route();
