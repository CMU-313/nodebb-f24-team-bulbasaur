'use strict';

const db = require('../database');

module.exports = function (Topics) {
	Topics.markAsSolved = async function (tid) {
		await db.setObjectField(`topic:${tid}`, 'solved', 1);
	};

	Topics.markAsUnsolve = async function (tid) {
		await db.setObjectField(`topic:${tid}`, 'solved', 0);
	};
};
