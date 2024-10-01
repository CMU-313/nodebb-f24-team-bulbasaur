
'use strict';

const async = require('async');
const _ = require('lodash');

const db = require('../database');
const user = require('../user');
const posts = require('../posts');
const notifications = require('../notifications');
const categories = require('../categories');
const privileges = require('../privileges');
const meta = require('../meta');
const utils = require('../utils');
const plugins = require('../plugins');

module.exports = function (Topics) {
    Topics.markAsSolved = async function (tid) {
		console.log('Topics.markAsSolved')
		db.setObjectField(`topic:${tid}`, 'solved', 1);
	}

	Topics.markAsUnsolve = async function (tid) {
		console.log('Topics.markAsUnsolve')
		console.log("tid", tid)
		db.setObjectField(`topic:${tid}`, 'solved', 0);
	}
};