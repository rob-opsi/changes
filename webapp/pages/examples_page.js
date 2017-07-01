import React from 'react';
import URI from 'urijs';

import Examples from 'display/examples';
import {ChangesPage} from 'display/page_chrome';

/*
 * Renders example uses of the reusable display tags in display/
 */
var DisplayExamplesPage = React.createClass({
  getInitialTitle: function() {
    return 'Examples';
  },

  render: function() {
    var removeHref = URI(window.location.href).addQuery('disable_custom', 1).toString();

    var removeLink = <a href={removeHref}>Render without any custom JS/CSS</a>;

    return (
      <ChangesPage>
        <div className="marginBottomM">
          {removeLink}
        </div>
        {Examples.render()}
      </ChangesPage>
    );
  }
});

export default DisplayExamplesPage;
