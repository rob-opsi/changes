import React from 'react';
import DocumentTitle from 'react-document-title';

import config from './config';
import {make_api_ajax_get} from 'server/api';
import custom_content_hook from 'utils/custom_content';
import {setPageTitle} from 'utils/utils';

export default React.createClass({
  componentDidMount() {
    // we fetch some initial data used by pages (e.g. are we logged in?)
    make_api_ajax_get('/api/0/initial/', null, function(response) {
      var parsedResponse = JSON.parse(response.responseText);

      // TODO: use context?
      if (parsedResponse['auth'] && parsedResponse['auth'].user) {
        config.set('auth', parsedResponse['auth']);
      }
      if (parsedResponse['admin_message']) {
        config.set('admin_message', parsedResponse['admin_message']);
      }

      // require user to be logged in
      if (!config.get('auth')) {
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
    });
  },

  render() {
    return (
      <DocumentTitle title="Changes">
        <div id="container">
          {this.props.children}
        </div>
      </DocumentTitle>
    );
  }
});
