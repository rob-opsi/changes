import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import {Router, browserHistory} from 'react-router';

import Routes from './common/Routes';

ReactDOM.render(
  <Router history={browserHistory}>
    {Routes}
  </Router>,
  document.getElementById('reactRoot')
);
