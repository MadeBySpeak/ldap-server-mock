'use strict';

/**
 * Manages the database of LDAP users.
 *
 * @class databaseProvider
 * @static
 */

const database = process.require('lib/database.js');
const conf = process.require('lib/conf.js');

/**
 * Fetches user from database.
 *
 * User attribute containing the login is defined by the userLoginAttribute property of the server configuration.
 *
 * @method getUser
 * @static
 * @params {String} login User login
 * @return {Object} The user as is
 */
module.exports.getUser = (login) => {
  const users = database.users;
  const loginAttribute = conf.server.userLoginAttribute;
  let fetchedUser;
  let user = {attributes: {}};

  for (let user in users) {
    if (users[user][loginAttribute] === login) {
      fetchedUser = users[user];
      break;
    }
  }

  if (!fetchedUser) return null;

  user.dn = fetchedUser.dn;
  for (let propertyName in fetchedUser) {
    if (propertyName !== 'dn')
      user.attributes[propertyName] = fetchedUser[propertyName];
  }

  return user;
};

const runFilter = (filter, users) => users.filter(user => {
  let userAttr = user && user[filter.attribute] ? user[filter.attribute] : '';
  if (typeof (userAttr) !== 'string') {
    userAttr = userAttr.toString();
  }
  const match = (filter.value && userAttr.indexOf(filter.value) > -1) ||
        (filter.any && filter.any.some(a => {
          return userAttr.indexOf(a) > -1;
        }));
  return match;
});

module.exports.getUserForFilters = (filters) => {
  let users = database.users;
  let fetchedUsers = [];
  for (var i = 0; i < filters.length; i++) {
    const filter = filters[i];
    let foundUsers = [...fetchedUsers];
    if (filter.filters) {
      let subFilteredUsers = [];
      filter.filters.forEach(subFilter => {
        subFilteredUsers = [...subFilteredUsers, ...runFilter(subFilter, users)];
      });
      foundUsers = [...foundUsers, ...subFilteredUsers];
    } else {
      foundUsers = [...foundUsers, ...runFilter(filter, users)];
    }
    fetchedUsers = [...foundUsers];
  }
  if (!fetchedUsers || fetchedUsers.length === 0) {
    return null;
  }
  const rtnUsers = [];
  fetchedUsers.forEach(fetchedUser => {
    const user = {attributes: {}};
    user.dn = fetchedUser.dn;
    for (let propertyName in fetchedUser) {
      if (propertyName !== 'dn')
        user.attributes[propertyName] = fetchedUser[propertyName];
    }
    if (rtnUsers.findIndex(r => r.attributes.uid === user.attributes.uid) === -1) {
      rtnUsers.push(user);
    }
  });

  return rtnUsers;
};
