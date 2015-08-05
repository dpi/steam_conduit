"use strict";

var restify = require('restify');
var fs = require('fs');
var crypto = require('crypto');
var _ = require('underscore');

var Steam = require('steam');
var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);

var config = JSON.parse(fs.readFileSync('./config.json'));

var greetings = [];

// an array of objects with properties: username, code, steamid keyed by a
// unique numeric code ID. The ID has no special meaning to this server.
var friend_codes = {};

// REST Server
// =============================================================================

var server = restify.createServer({
  name: 'steam_conduit',
  version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.listen(config.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});

// List codes.
server.get('/friend_codes', function (req, res, next) {
  res.send(friend_codes);
  return next();
});

// Create code.
server.post('/friend_codes', function (req, res, next) {
  var body = req.body;
  var hasData = ['id', 'code', 'user_label'].every(function(k) {
    return body.hasOwnProperty(k);
  });

  if (hasData) {
    friend_codes[body.id] = {
      'code': body.code,
      'username': body.user_label,
      'steamid': undefined
    };
  }
  else {
    res.status(400);
  }

  res.send('');
  return next();
});

server.del('/friend_codes/:id', function (req, res, next) {
  var body = req.body;
  var id = req.params['id'];
  var hasData = ['bound'].every(function(k) {
    return body.hasOwnProperty(k);
  });

  if (hasData) {
    var friend_code = friend_codes[id];
    if (typeof friend_code !== 'undefined') {
      if (body.bound) {
        steamFriends.sendMessage(friend_code.steamid, 'Your Steam ID is now linked to account: ' + friend_code.username, Steam.EChatEntryType.ChatMsg);
      }
      delete friend_codes[id];
    }
  }
  else {
    res.status(400);
  }

  res.send('');
  return next();
});

server.post('/message', function (req, res, next) {
  var body = req.body;
  if (typeof body.steam_id !== 'undefined' && typeof body.message !== 'undefined') {
    steamFriends.sendMessage(body.steam_id, body.message, Steam.EChatEntryType.ChatMsg);
  }
  res.send('sent');
  return next();
});

// Steam client
// =============================================================================

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn({
    account_name: config.steam.username,
    password: config.steam.password,
    //auth_code: config.steam.auth ? config.steam.auth : undefined,
    sha_sentryfile: (fs.existsSync('sentry') ? getSHA1(fs.readFileSync('sentry')) : undefined)
  });
});

steamClient.on('logOnResponse', function() {
  "use strict";
  console.log('Authenticated successfully with Steam.');
  steamFriends.setPersonaName(config.steam.nickname);
  steamFriends.setPersonaState(Steam.EPersonaState.Online);
  if (config.steam.game !== "") {
    steamUser.gamesPlayed([{
      "game_id": config.steam.game
    }]);
  }
});


steamUser.on('updateMachineAuth', function(sentry, callback) {
    fs.writeFileSync('sentry', sentry.bytes);
    callback({ sha_file: getSHA1(sentry.bytes) });
});

function getSHA1(bytes) {
    var sha = crypto.createHash('sha1');
    sha.end(bytes);
    return sha.read();
}

steamFriends.on('relationships', function() {
  for (var group_id in steamClient.groups) {
    if (steamClient.groups.hasOwnProperty(group_id)) {
      if (steamClient.groups[group_id] === Steam.EClanRelationship.Member) {
        console.log('i am a member of ' + group_id);
      }
    }
  }
  for (var steamid in steamFriends.friends) {
    if (steamFriends.friends.hasOwnProperty(steamid)) {
      // Active friend: Steam.EFriendRelationship.Friend

      // Someone friended me while is was offline.
      if (steamFriends.friends[steamid] === Steam.EFriendRelationship.RequestRecipient) {
          steamFriends.addFriend(steamid);
      }
    }
  }
});

steamFriends.on('friend', function(steamid, status) {
  // Handles new friend requests while the bot is online.
  console.log('friend debug:' + steamid + ' :: ' + status);
  if (status === Steam.EFriendRelationship.RequestRecipient) {
    console.log('auto accepting a friend:' + steamid);
    // @todo auto accept/deny request depending if user is also in group
    steamFriends.addFriend(steamid);
  }
});

steamFriends.on('message', function (source, message, type, chatter) {
  if (type === Steam.EChatEntryType.ChatMsg) {
    console.log(source + ' said: ' + message);

    // determine if the message contained a friend code
    var friend_code = _.find(friend_codes, function(data) {
      return message.indexOf(data.code) !== -1;
    });

    if (typeof friend_code !== 'undefined') {
      steamFriends.sendMessage(source, 'Thank you for the code!\nI will inform you when your account has been linked.', Steam.EChatEntryType.ChatMsg);
      steamFriends.sendMessage(source, '', Steam.EChatEntryType.Typing);
      friend_code.steamid = source;
    }
    else {
      steamFriends.sendMessage(source, 'I\'m sorry, I have no response for you.', Steam.EChatEntryType.ChatMsg);
    }
  }
  else if (type === Steam.EChatEntryType.Typing) {
    if (greetings.indexOf(source) === -1) {
      greetings.push(source);
      steamFriends.sendMessage(source, 'Greetings!', Steam.EChatEntryType.ChatMsg);
    }
  }
});