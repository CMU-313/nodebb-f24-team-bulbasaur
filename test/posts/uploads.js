'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const nconf = require('nconf');
const crypto = require('crypto');

const db = require('../mocks/databasemock');

const categories = require('../../src/categories');
const topics = require('../../src/topics');
const posts = require('../../src/posts');
const user = require('../../src/user');
const meta = require('../../src/meta');
const file = require('../../src/file');
const utils = require('../../src/utils');

const _filenames = ['abracadabra.png', 'shazam.jpg', 'whoa.gif', 'amazeballs.jpg', 'wut.txt', 'test.bmp'];
const _recreateFiles = () => {
	// Create stub files for testing
	_filenames.forEach(filename => fs.closeSync(fs.openSync(path.join(nconf.get('upload_path'), 'files', filename), 'w')));
};

describe('post uploads management', () => {
	let topic;
	let reply;
	let uid;
	let cid;

	before(async () => {
		_recreateFiles();

		uid = await user.create({
			username: 'uploads user',
			password: 'abracadabra',
			gdpr_consent: 1,
		});

		({ cid } = await categories.create({
			name: 'Test Category',
			description: 'Test category created by testing script',
		}));

		const topicPostData = await topics.post({
			uid,
			cid,
			title: 'topic to test uploads with',
			content: '[abcdef](/assets/uploads/files/abracadabra.png)',
		});

		const replyData = await topics.reply({
			uid,
			tid: topicPostData.topicData.tid,
			timestamp: Date.now(),
			content: '[abcdef](/assets/uploads/files/shazam.jpg)',
		});

		topic = topicPostData;
		reply = replyData;
	});

	it('should automatically sync uploads on topic create and reply', (done) => {
		db.sortedSetsCard([`post:${topic.topicData.mainPid}:uploads`, `post:${reply.pid}:uploads`], (err, lengths) => {
			assert.ifError(err);
			assert.strictEqual(lengths[0], 1);
			assert.strictEqual(lengths[1], 1);
			done();
		});
	});

	it('should automatically sync uploads on post edit', async () => {
		await posts.edit({
			pid: reply.pid,
			uid,
			content: 'no uploads',
		});
		const uploads = await posts.uploads.list(reply.pid);
		assert.strictEqual(true, Array.isArray(uploads));
		assert.strictEqual(0, uploads.length);
	});
});
