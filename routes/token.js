var express = require('express');
var router = express.Router();
var {actions} = require('../js/actions');
var {commands} = require('../js/commands');

/* post token listing. */
router.post('/', function (req, res, next) {
  try {
    const { callback_query, message } = req.body;
    if (callback_query) {
      const action = callback_query.data.split('|')[0];
      console.log('\n action: ', action)
      actions[action] && actions[action](callback_query);
    } else if (message) {
      const command = message.text.split(' ')[0];
      console.log('\n command: ', command)
      commands[command] && commands[command](message);
    }
  
    res.send('POST request success');
  } catch(e){
    console.log('\nPOST ERROR: ', e)
  }
});

/* get token listing. */
router.get('/', function (req, res, next) {

  res.render('index', { title: 'token tg' });
});

module.exports = router;
