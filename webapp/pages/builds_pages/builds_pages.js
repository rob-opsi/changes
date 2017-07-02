import React, {PropTypes} from 'react';
import {Link} from 'react-router';
import moment from 'moment';
import URI from 'urijs';
import _ from 'lodash';

import ChangesLinks from 'display/changes/links';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {Error} from 'display/errors';
import {ManyBuildsStatus} from 'display/changes/builds';
import {TimeText} from 'display/time';
import {get_build_cause} from 'display/changes/build_text';
import {
  get_runnable_condition,
  get_runnable_condition_short_text,
  get_runnable_condition_color_cls
} from 'display/changes/build_conditions';

import Sidebar from 'pages/builds_pages/sidebar';
import {SingleBuild, LatestBuildsSummary} from 'pages/builds_pages/build_info';

import * as api from 'server/api';

import * as utils from 'utils/utils';

/*
 * The pages that show the results of builds run on a commit or diff. They're
 * just wrappers around BuildsPage
 */
// TODO: I need a page that just shows a single build, e.g. for arc test.

/**
 * Page that shows the builds associated with a single diff
 */
export const DiffPage = React.createClass({
  propTypes: {
    diff_id: PropTypes.string.isRequired
  },

  getInitialTitle() {
    return `${this.props.diff_id}: Builds`;
  },

  getInitialState() {
    return {
      diffBuilds: null
    };
  },

  componentDidMount() {
    var diff_id = this.props.diff_id;
    api.fetch(this, {
      diffBuilds: `/api/0/phabricator_diffs/${diff_id}/builds`
    });
  },

  render() {
    if (!api.isLoaded(this.state.diffBuilds)) {
      return <APINotLoadedPage calls={this.state.diffBuilds} />;
    }
    var diff_data = this.state.diffBuilds.getReturnedData();
    // Note: if the "fetched_data_from_phabricator" key is false, we weren't
    // able to reach phabricator. We still have builds data that we want to
    // render...just do our best to deal with the missing phabricator data.

    // TODO: delete
    diff_data['fetched_data_from_phabricator'] = true;

    // emergency backups in case phabricator is unreachable
    diff_data['revision_id'] = diff_data['revision_id'] || this.props.diff_id.substr(1);
    diff_data['dateCreated'] = diff_data['dateCreated'] || 0; // unix timestamp

    var builds = _.flatten(diff_data.changes.map(c => c.builds));

    return (
      <BuildsPage
        type="diff"
        targetData={diff_data}
        builds={builds}
        params={this.props.params}
      />
    );
  }
});

/**
 * Page that shows the builds associated with a single commit
 */
export const CommitPage = React.createClass({
  getInitialState() {
    return {
      commitBuilds: null,
      source: null
    };
  },

  componentDidMount() {
    var {sourceID} = this.props.params;

    // BuildsPage.getContent() below assumes that a selected ID is present in
    // the list, and if the build is missing it crashes the page. Get as many
    // builds as possible up front to minimize the chances of this happening,
    // as a quick workaround.
    let fetch_one_page_of_builds = endpoint => {
      api.make_api_ajax_get(
        endpoint,
        null,
        response => {
          let api_response = api.APIResponse(endpoint);
          api_response.response = response;
          // TODO(dcramer): for some reason this isn't being coerced into an array
          let new_items = api_response.getReturnedData();
          let new_endpoint = api_response.getLinksFromHeader();
          if ('next' in new_endpoint) {
            fetch_one_page_of_builds(new_endpoint.next);
          } else {
            this.setState(state => {
              return {
                commitBuilds: [...(state.commitBuilds || []), ...new_items]
              };
            });
          }
        },
        error => {
          console.log(`Error fetching builds. (${endpoint})`);
        }
      );
    };

    // 100 is max page size.
    let endpoint = `/api/0/sources_builds/?source_id=${sourceID}&per_page=100`;
    fetch_one_page_of_builds(endpoint);
    api.fetch(this, {
      source: `/api/0/sources/${sourceID}`
    });
  },

  render() {
    // special-case source API errors...it might be because the commit contains unicode
    if (api.isError(this.state.source)) {
      if (this.state.commitBuilds === null) {
        return <APINotLoadedPage calls={this.state.commitBuilds} />;
      }

      var links = this.state.commitBuilds.getReturnedData().map(b => {
        var href = URI(`/builds/${b.id}`);
        var condition = get_runnable_condition(b);
        return (
          <div>
            <TimeText time={b.dateFinished || b.dateStarted || b.dateCreated} />
            {': '}
            <Link to={href}>
              {b.project.name}
            </Link>
            {' ('}
            <span className={get_runnable_condition_color_cls(condition)}>
              {get_runnable_condition_short_text(condition)}
            </span>
            {')'}
          </div>
        );
      });

      return (
        <ChangesPage>
          <p>
            We couldn{"'"}t load this commit. Oftentimes this is because it contains
            unicode characters, which we don{"'"}t properly support. Rest assured that we
            feel both regret and self-loathing about this.
          </p>

          <p>
            Here are links to the individual builds. Hopefully you{"'"}ll have a better
            chance loading those pages:
          </p>
          <div className="marginTopL">
            {links}
          </div>
        </ChangesPage>
      );
    }

    if (this.state.commitBuilds === null || !api.allLoaded([this.state.source])) {
      return <APINotLoadedPage calls={[this.state.commitBuilds, this.state.source]} />;
    }

    var sha = this.state.source.getReturnedData().revision.sha;
    utils.setPageTitle(`${sha.substr(0, 7)}: Builds`);

    return (
      <BuildsPage
        type="commit"
        targetData={this.state.source.getReturnedData()}
        builds={this.state.commitBuilds}
        params={this.props.params}
      />
    );
  }
});

/** ---IMPLEMENTATION--- **/

/**
 * The internal page shared by CommitPage and DiffPage (since the logic is
 * basically the same)
 */
const BuildsPage = React.createClass({
  propTypes: {
    // are we rendering for a diff or a commit
    type: PropTypes.oneOf(['diff', 'commit']).isRequired,
    // info about the commit (a changes source object) or diff (from phab.)
    targetData: PropTypes.object,
    // the builds associated with this diff/commit. They may be more sparse
    // than a call to build_details...we use this to populate the sidebar
    builds: PropTypes.array.isRequired
  },

  getInitialState() {
    return {
      activeBuildID: this.props.params.buildID,
      tests: {} // fetched on demand
    };
  },

  componentWillReceiveProps(nextProps) {
    this.updateWindowUrl();
  },

  render() {
    // TODO: cleanup!
    return (
      <ChangesPage bodyPadding={false} fixed={true}>
        <div className="buildsLabelHeader fixedClass">
          {this.renderLabelHeader()}
        </div>
        <Sidebar
          builds={this.props.builds}
          type={this.props.type}
          targetData={this.props.targetData}
          activeBuildID={this.state.activeBuildID}
          pageElem={this}
        />
        <div className="buildsContent changeMarginAdminMsg">
          <div className="buildsInnerContent">
            {this.getErrorMessage()}
            {this.getContent()}
          </div>
        </div>
      </ChangesPage>
    );
  },

  updateWindowUrl() {
    var query_params = URI(window.location.href).search(true);
    if (this.state.activeBuildID !== this.props.params.buildID) {
      query_params['buildID'] = this.state.activeBuildID;
      window.history.replaceState(
        null,
        'changed tab',
        URI(window.location.href)
          .search(_.pick(query_params, value => !!value))
          .toString()
      );
    }
  },

  getErrorMessage() {
    if (this.props.type === 'diff') {
      var diff_data = this.props.targetData;
      if (!diff_data['fetched_data_from_phabricator']) {
        return (
          <Error className="marginBottomM">
            Unable to get diff data from Phabricator!
          </Error>
        );
      }
    }
    return null;
  },

  getContent() {
    var builds = this.props.builds;

    if (this.state.activeBuildID) {
      var build = builds.filter(b => b.id === this.state.activeBuildID);
      if (build) {
        // use a key so that we remount when switching builds
        return React.addons.createFragment({
          [build[0].id]: <SingleBuild build={build[0]} />
        });
      }
    }

    // get all builds for latest code
    var latest_builds = builds;

    if (this.props.type === 'diff') {
      var builds_by_diff_id = _.groupBy(builds, b => b.source.data['phabricator.diffID']);

      var latest_diff_id = builds
        .sort((a, b) => b.dateCreated - a.dateCreated)
        .find(() => true);

      latest_builds = builds_by_diff_id[latest_diff_id];
    }

    return (
      <LatestBuildsSummary
        builds={latest_builds}
        type={this.props.type}
        targetData={this.props.targetData}
        pageElem={this}
      />
    );
  },

  renderLabelHeader() {
    var type = this.props.type;

    var header = 'No header yet';
    if (type === 'commit') {
      var source = this.props.targetData;
      var authorLink = ChangesLinks.author(source.revision.author);
      var commitLink = ChangesLinks.phabCommitHref(source.revision);

      var parentElem = null;
      if (source.revision.parents && source.revision.parents.length > 0) {
        parentElem = (
          <ParentCommit
            sha={source.revision.parents[0]}
            repoID={source.revision.repository.id}
            label={source.revision.parents.length <= 1 ? 'only' : 'first'}
          />
        );
      }

      header = (
        <div>
          <div className="floatR">
            <TimeText time={source.revision.dateCreated} />
          </div>
          <a className="subtle lb" href={commitLink} target="_blank">
            {source.revision.sha.substring(0, 7)}
          </a>
          {': '}
          {utils.truncate(utils.first_line(source.revision.message))}
          <div className="headerByline">
            {'by '}
            {authorLink}
            {parentElem}
          </div>
        </div>
      );
    } else if (type === 'diff') {
      var diffData = this.props.targetData;
      var authorLink = ChangesLinks.author(
        this.getAuthorForDiff(this.props.builds),
        true
      );

      var parentElem = null;
      var diffSource = this.getSourceForDiff(this.props.builds);
      if (diffSource) {
        // maybe this is missing if we have no builds?
        parentElem = (
          <ParentCommit
            sha={diffSource.revision.sha}
            repoID={diffSource.revision.repository.id}
            label="diffParent"
          />
        );
      }

      header = (
        <div>
          <div className="floatR">
            <TimeText time={moment.unix(diffData.dateCreated).toString()} />
          </div>
          <a className="subtle lb" href={diffData.uri} target="_blank">
            D{diffData.id}
          </a>
          {': '}
          {utils.truncate(diffData.title)}
          <div className="headerByline">
            {'by '}
            {authorLink}
            {parentElem}
          </div>
        </div>
      );
    } else {
      throw 'unreachable';
    }

    return header;
  },

  getAuthorForDiff(builds) {
    // the author of any cause=phabricator build for a diff is always the
    // same as the author of the diff.
    var author = null;
    builds.forEach(b => {
      if (get_build_cause(b) === 'phabricator') {
        author = b.author;
      }
    });
    return author;
  },

  getSourceForDiff(builds) {
    return builds && builds.length && builds[0].source;
  }
});

export const SingleBuildPage = React.createClass({
  getInitialState() {
    return {
      build: null
    };
  },

  componentDidMount() {
    api.fetch(this, {
      build: `/api/0/builds/${this.props.params.buildID}`
    });
  },

  render() {
    if (!api.isLoaded(this.state.build)) {
      return <APINotLoadedPage calls={this.state.build} />;
    }
    var build = this.state.build.getReturnedData();

    utils.setPageTitle(`A ${build.project.name} Build`);

    return (
      <ChangesPage>
        <SingleBuild build={build} />
      </ChangesPage>
    );
  }
});

export const ParentCommit = React.createClass({
  propTypes: {
    sha: PropTypes.string.isRequired,
    repoID: PropTypes.string.isRequired,
    label: PropTypes.oneOf(['only', 'first', 'diffParent']).isRequired
  },

  getInitialState() {
    return {builds: null};
  },

  componentDidMount() {
    var sha = this.props.sha;
    var repoID = this.props.repoID;

    api.fetch(this, {
      builds: URI('/api/0/sources_builds/')
        .addQuery({revision_sha: sha, repo_id: repoID, tag: 'commit'})
        .toString()
    });
  },

  render() {
    var sha = this.props.sha;
    var labelProp = this.props.label;

    var label = {
      only: 'Parent: ',
      first: 'First Parent: ',
      diffParent: 'Parent Commit: '
    }[labelProp];

    if (!api.isLoaded(this.state.builds)) {
      return <span />;
    }

    var builds = this.state.builds.getReturnedData();
    let shortSha = sha.substr(0, 7);
    let shaMarkup = null;
    if (builds.length > 0) {
      shaMarkup = (
        <span>
          <a className="marginLeftXS" href={ChangesLinks.buildsHref(builds)}>
            {shortSha}
          </a>
          <ManyBuildsStatus builds={builds} />
        </span>
      );
    } else {
      shaMarkup = (
        <span className="marginLeftXS">
          {shortSha}
        </span>
      );
    }
    return (
      <span className="parentLabel marginLeftS">
        &middot;
        <span className="marginLeftS">{label}</span>
        {shaMarkup}
      </span>
    );
  }
});

export default BuildsPage;
