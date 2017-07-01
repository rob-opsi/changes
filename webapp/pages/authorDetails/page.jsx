import React, {PropTypes} from 'react';
import _ from 'lodash';

import ChangesLinks from 'display/changes/links';
import SectionHeader from 'display/section_header';
import {AjaxError} from 'display/errors';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {Grid} from 'display/grid';
import {SingleBuildStatus} from 'display/changes/builds';
import {TimeText} from 'display/time';
import {get_build_cause} from 'display/changes/build_text';

import InteractiveData from 'pages/helpers/interactive_data';

import * as utils from 'utils/utils';

export default React.createClass({
  propTypes: {
    author: PropTypes.string
  },

  componentWillMount: function() {
    var author = this.props.params.author || 'me';

    this.setState({
      buildsInteractive: InteractiveData(
        this,
        'buildsInteractive',
        `/api/0/authors/${author}/builds/`
      )
    });
  },

  componentDidMount: function() {
    if (!this.state.buildsInteractive.hasRunInitialize()) {
      this.state.buildsInteractive.initialize({});
    }
  },

  render: function() {
    var interactive = this.state.buildsInteractive;

    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoadedPage calls={interactive.getDataToShow()} />;
    }

    var data_to_show = interactive.getDataToShow();

    var data = data_to_show.getReturnedData().map(build => {
      var target = null;
      if (_.contains(build.tags, 'arc test')) {
        target = '';
      } else if (build.source.patch) {
        target = (
          <a
            className="external"
            href={build.source.data['phabricator.revisionURL']}
            target="_blank">
            {'D' + build.source.data['phabricator.revisionID']}
          </a>
        );
      } else {
        target = ChangesLinks.phabCommit(build.source.revision);
      }

      return [
        <SingleBuildStatus build={build} parentElem={this} />,
        <a className="subtle" href={ChangesLinks.buildHref(build)}>
          {build.name}
        </a>,
        target,
        ChangesLinks.project(build.project),
        get_build_cause(build),
        <TimeText time={build.dateStarted} />
      ];
    });

    var cellClasses = [
      'buildWidgetCell',
      'wide easyClick',
      'nowrap',
      'nowrap',
      'nowrap',
      'nowrap'
    ];

    var headers = ['Result', 'Name', 'Target', 'Project', 'Cause', 'Started'];

    var error_message = null;
    if (interactive.failedToLoadUpdatedData()) {
      error_message = (
        <AjaxError response={interactive.getDataForErrorMessage().response} />
      );
    }

    var style = interactive.isLoadingUpdatedData() ? {opacity: 0.5} : null;

    var title = 'My Builds',
      headerText = 'My Builds';
    if (this.props.params.author && this.props.params.author !== 'me') {
      var username = utils.email_head(this.props.params.author);
      title = `${username} - Builds`;
      headerText = `Builds by ${username}`;
    }

    utils.setPageTitle(title);

    return (
      <ChangesPage>
        {error_message}
        <SectionHeader>
          {headerText}
        </SectionHeader>
        <div style={style}>
          <Grid colnum={6} cellClasses={cellClasses} data={data} headers={headers} />
          {this.renderPaging()}
        </div>
      </ChangesPage>
    );
  },

  renderPaging: function(builds) {
    var links = this.state.buildsInteractive.getPagingLinks();
    return (
      <div className="marginTopM marginBottomM">
        {links}
      </div>
    );
  }
});
