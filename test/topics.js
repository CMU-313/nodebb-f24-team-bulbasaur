'use strict';

const path = require('path');
const assert = require('assert');
const validator = require('validator');
const mockdate = require('mockdate');
const nconf = require('nconf');
const util = require('util');

const sleep = util.promisify(setTimeout);

const db = require('./mocks/databasemock');
const file = require('../src/file');
const topics = require('../src/topics');
const posts = require('../src/posts');
const categories = require('../src/categories');
const privileges = require('../src/privileges');
const meta = require('../src/meta');
const User = require('../src/user');
const groups = require('../src/groups');
const utils = require('../src/utils');
const helpers = require('./helpers');
const socketTopics = require('../src/socket.io/topics');
const apiTopics = require('../src/api/topics');
const apiPosts = require('../src/api/posts');
const request = require('../src/request');

describe('Topic\'s', () => {
	let topic;
	let categoryObj;
	let adminUid;
	let adminJar;
	let csrf_token;
	let fooUid;

	before(async () => {
		adminUid = await User.create({ username: 'admin', password: '123456' });
		fooUid = await User.create({ username: 'foo' });
		await groups.join('administrators', adminUid);
		const adminLogin = await helpers.loginUser('admin', '123456');
		adminJar = adminLogin.jar;
		csrf_token = adminLogin.csrf_token;

		categoryObj = await categories.create({
			name: 'Test Category',
			description: 'Test category created by testing script',
		});
		topic = {
			userId: adminUid,
			categoryId: categoryObj.cid,
			title: 'Test Topic Title',
			content: 'The content of test topic',
		};
	});

	describe('.post', () => {
		it('should fail to create topic with invalid data', async () => {
			try {
				await apiTopics.create({ uid: 0 }, null);
				assert(false);
			} catch (err) {
				assert.equal(err.message, '[[error:invalid-data]]');
			}
		});

		it('should create a new topic with proper parameters', (done) => {
			topics.post({
				uid: topic.userId,
				title: topic.title,
				content: topic.content,
				cid: topic.categoryId,
			}, (err, result) => {
				assert.ifError(err);
				assert(result);
				topic.tid = result.topicData.tid;
				done();
			});
		});

		it('should get post count', async () => {
			const count = await socketTopics.postcount({ uid: adminUid }, topic.tid);
			assert.strictEqual(count, 1);
		});

		it('should get users postcount in topic', async () => {
			assert.strictEqual(await socketTopics.getPostCountInTopic({ uid: 0 }, 0), 0);
			assert.strictEqual(await socketTopics.getPostCountInTopic({ uid: adminUid }, 0), 0);
			assert.strictEqual(await socketTopics.getPostCountInTopic({ uid: adminUid }, topic.tid), 1);
		});

		it('should load topic', async () => {
			const data = await apiTopics.get({ uid: adminUid }, { tid: topic.tid });
			assert.equal(data.tid, topic.tid);
		});

		it('should fail to create new topic with invalid user id', (done) => {
			topics.post({ uid: null, title: topic.title, content: topic.content, cid: topic.categoryId }, (err) => {
				assert.equal(err.message, '[[error:no-privileges]]');
				done();
			});
		});

		it('should fail to create new topic with empty title', (done) => {
			topics.post({ uid: fooUid, title: '', content: topic.content, cid: topic.categoryId }, (err) => {
				assert.ok(err);
				done();
			});
		});

		it('should fail to create new topic with empty content', (done) => {
			topics.post({ uid: fooUid, title: topic.title, content: '', cid: topic.categoryId }, (err) => {
				assert.ok(err);
				done();
			});
		});

		it('should fail to create new topic with non-existant category id', (done) => {
			topics.post({ uid: topic.userId, title: topic.title, content: topic.content, cid: 99 }, (err) => {
				assert.equal(err.message, '[[error:no-category]]', 'received no error');
				done();
			});
		});

		it('should return false for falsy uid', (done) => {
			topics.isOwner(topic.tid, 0, (err, isOwner) => {
				assert.ifError(err);
				assert(!isOwner);
				done();
			});
		});

		it('should fail to post a topic as guest with invalid csrf_token', async () => {
			const categoryObj = await categories.create({
				name: 'Test Category',
				description: 'Test category created by testing script',
			});
			await privileges.categories.give(['groups:topics:create'], categoryObj.cid, 'guests');
			await privileges.categories.give(['groups:topics:reply'], categoryObj.cid, 'guests');
			const result = await request.post(`${nconf.get('url')}/api/v3/topics`, {
				data: {
					title: 'just a title',
					cid: categoryObj.cid,
					content: 'content for the main post',
				},
				headers: {
					'x-csrf-token': 'invalid',
				},
			});
			assert.strictEqual(result.response.statusCode, 403);
			assert.strictEqual(result.body, 'Forbidden');
		});

		it('should fail to post a topic as guest if no privileges', async () => {
			const categoryObj = await categories.create({
				name: 'Test Category',
				description: 'Test category created by testing script',
			});
			const jar = request.jar();
			const result = await helpers.request('post', `/api/v3/topics`, {
				body: {
					title: 'just a title',
					cid: categoryObj.cid,
					content: 'content for the main post',
				},
				jar: jar,
			});
			assert.strictEqual(result.body.status.message, 'You do not have enough privileges for this action.');
		});

		it('should post a topic as guest if guest group has privileges', async () => {
			const categoryObj = await categories.create({
				name: 'Test Category',
				description: 'Test category created by testing script',
			});
			await privileges.categories.give(['groups:topics:create'], categoryObj.cid, 'guests');
			await privileges.categories.give(['groups:topics:reply'], categoryObj.cid, 'guests');

			const jar = request.jar();
			const result = await helpers.request('post', `/api/v3/topics`, {
				body: {
					title: 'just a title',
					cid: categoryObj.cid,
					content: 'content for the main post',
				},
				jar: jar,
				json: true,
			});

			assert.strictEqual(result.body.status.code, 'ok');
			assert.strictEqual(result.body.response.title, 'just a title');
			assert.strictEqual(result.body.response.user.username, '[[global:guest]]');

			const replyResult = await helpers.request('post', `/api/v3/topics/${result.body.response.tid}`, {
				body: {
					content: 'a reply by guest',
				},
				jar: jar,
			});
			assert.strictEqual(replyResult.body.response.content, 'a reply by guest');
			assert.strictEqual(replyResult.body.response.user.username, '[[global:guest]]');
		});
	});

	describe('.reply', () => {
		let newTopic;
		let newPost;

		before((done) => {
			topics.post({
				uid: topic.userId,
				title: topic.title,
				content: topic.content,
				cid: topic.categoryId,
			}, (err, result) => {
				if (err) {
					return done(err);
				}

				newTopic = result.topicData;
				newPost = result.postData;
				done();
			});
		});

		it('should create a new reply with proper parameters', (done) => {
			topics.reply({ uid: topic.userId, content: 'test post', tid: newTopic.tid }, (err, result) => {
				assert.equal(err, null, 'was created with error');
				assert.ok(result);

				done();
			});
		});

		it('should handle direct replies', async () => {
			const result = await topics.reply({ uid: topic.userId, content: 'test reply', tid: newTopic.tid, toPid: newPost.pid });
			assert.ok(result);

			const postData = await apiPosts.getReplies({ uid: 0 }, { pid: newPost.pid });
			assert.ok(postData);

			assert.equal(postData.length, 1, 'should have 1 result');
			assert.equal(postData[0].pid, result.pid, 'result should be the reply we added');
		});

		it('should error if pid is not a number', async () => {
			await assert.rejects(
				apiPosts.getReplies({ uid: 0 }, { pid: 'abc' }),
				{ message: '[[error:invalid-data]]' }
			);
		});

		it('should fail to create new reply with invalid user id', (done) => {
			topics.reply({ uid: null, content: 'test post', tid: newTopic.tid }, (err) => {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
				done();
			});
		});

		it('should fail to create new reply with empty content', (done) => {
			topics.reply({ uid: fooUid, content: '', tid: newTopic.tid }, (err) => {
				assert.strictEqual(err.message, '[[error:content-too-short, 8]]');
				done();
			});
		});

		it('should fail to create new reply with invalid topic id', (done) => {
			topics.reply({ uid: null, content: 'test post', tid: 99 }, (err) => {
				assert.strictEqual(err.message, '[[error:no-topic]]');
				done();
			});
		});

		it('should fail to create new reply with invalid toPid', (done) => {
			topics.reply({ uid: topic.userId, content: 'test post', tid: newTopic.tid, toPid: '"onmouseover=alert(1);//' }, (err) => {
				assert.strictEqual(err.message, '[[error:invalid-pid]]');
				done();
			});
		});

		it('should properly create a new reply with toPid that has been deleted (user\'s own deleted post)', async () => {
			const { postData } = await topics.post({
				uid: topic.userId,
				cid: topic.categoryId,
				title: utils.generateUUID(),
				content: utils.generateUUID(),
			});
			await posts.delete(postData.pid, topic.userId);
			const uid = await User.create({ username: utils.generateUUID().slice(0, 10) });

			const { pid } = await topics.reply({ uid: topic.userId, content: 'test post', tid: postData.topic.tid, toPid: postData.pid });
			assert(pid);
		});
	});

	describe('Get methods', () => {
		let newTopic;
		let newPost;

		before((done) => {
			topics.post({
				uid: topic.userId,
				title: topic.title,
				content: topic.content,
				cid: topic.categoryId,
			}, (err, result) => {
				if (err) {
					return done(err);
				}

				newTopic = result.topicData;
				newPost = result.postData;
				done();
			});
		});


		it('should not receive errors', (done) => {
			topics.getTopicData(newTopic.tid, (err, topicData) => {
				assert.ifError(err);
				assert(typeof topicData.tid === 'number');
				assert(typeof topicData.uid === 'number');
				assert(typeof topicData.cid === 'number');
				assert(typeof topicData.mainPid === 'number');

				assert(typeof topicData.timestamp === 'number');
				assert.strictEqual(topicData.postcount, 1);
				assert.strictEqual(topicData.viewcount, 0);
				assert.strictEqual(topicData.upvotes, 0);
				assert.strictEqual(topicData.downvotes, 0);
				assert.strictEqual(topicData.votes, 0);
				assert.strictEqual(topicData.deleted, 0);
				assert.strictEqual(topicData.locked, 0);
				assert.strictEqual(topicData.pinned, 0);
				done();
			});
		});

		it('should get a single field', (done) => {
			topics.getTopicFields(newTopic.tid, ['slug'], (err, data) => {
				assert.ifError(err);
				assert(Object.keys(data).length === 1);
				assert(data.hasOwnProperty('slug'));
				done();
			});
		});

		it('should get topic title by pid', (done) => {
			topics.getTitleByPid(newPost.pid, (err, title) => {
				assert.ifError(err);
				assert.equal(title, topic.title);
				done();
			});
		});

		it('should get topic data by pid', (done) => {
			topics.getTopicDataByPid(newPost.pid, (err, data) => {
				assert.ifError(err);
				assert.equal(data.tid, newTopic.tid);
				done();
			});
		});
	});

	describe('tools/delete/restore/purge', () => {
		let newTopic;
		let followerUid;
		let moveCid;

		before(async () => {
			({ topicData: newTopic } = await topics.post({
				uid: topic.userId,
				title: topic.title,
				content: topic.content,
				cid: topic.categoryId,
			}));
			followerUid = await User.create({ username: 'topicFollower', password: '123456' });
			await topics.follow(newTopic.tid, followerUid);

			({ cid: moveCid } = await categories.create({
				name: 'Test Category',
				description: 'Test category created by testing script',
			}));
		});

		it('should load topic tools', (done) => {
			socketTopics.loadTopicTools({ uid: adminUid }, { tid: newTopic.tid }, (err, data) => {
				assert.ifError(err);
				assert(data);
				done();
			});
		});

		it('should delete the topic', async () => {
			await apiTopics.delete({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const deleted = await topics.getTopicField(newTopic.tid, 'deleted');
			assert.strictEqual(deleted, 1);
		});

		it('should restore the topic', async () => {
			await apiTopics.restore({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const deleted = await topics.getTopicField(newTopic.tid, 'deleted');
			assert.strictEqual(deleted, 0);
		});

		it('should lock topic', async () => {
			await apiTopics.lock({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const isLocked = await topics.isLocked(newTopic.tid);
			assert(isLocked);
		});

		it('should unlock topic', async () => {
			await apiTopics.unlock({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const isLocked = await topics.isLocked(newTopic.tid);
			assert(!isLocked);
		});

		it('should pin topic', async () => {
			await apiTopics.pin({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const pinned = await topics.getTopicField(newTopic.tid, 'pinned');
			assert.strictEqual(pinned, 1);
		});

		it('should unpin topic', async () => {
			await apiTopics.unpin({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const pinned = await topics.getTopicField(newTopic.tid, 'pinned');
			assert.strictEqual(pinned, 0);
		});

		it('should move all topics', (done) => {
			socketTopics.moveAll({ uid: adminUid }, { cid: moveCid, currentCid: categoryObj.cid }, (err) => {
				assert.ifError(err);
				topics.getTopicField(newTopic.tid, 'cid', (err, cid) => {
					assert.ifError(err);
					assert.equal(cid, moveCid);
					done();
				});
			});
		});

		it('should move a topic', (done) => {
			socketTopics.move({ uid: adminUid }, { cid: categoryObj.cid, tids: [newTopic.tid] }, (err) => {
				assert.ifError(err);
				topics.getTopicField(newTopic.tid, 'cid', (err, cid) => {
					assert.ifError(err);
					assert.equal(cid, categoryObj.cid);
					done();
				});
			});
		});

		it('should purge the topic', async () => {
			await apiTopics.purge({ uid: adminUid }, { tids: [newTopic.tid], cid: categoryObj.cid });
			const isMember = await db.isSortedSetMember(`uid:${followerUid}:followed_tids`, newTopic.tid);
			assert.strictEqual(false, isMember);
		});
	});

	describe('infinitescroll', () => {
		const socketTopics = require('../src/socket.io/topics');
		let tid;
		before((done) => {
			topics.post({
				uid: topic.userId,
				title: topic.title,
				content: topic.content,
				cid: topic.categoryId,
			}, (err, result) => {
				assert.ifError(err);
				tid = result.topicData.tid;
				done();
			});
		});

		it('should error with invalid data', (done) => {
			socketTopics.loadMore({ uid: adminUid }, {}, (err) => {
				assert.equal(err.message, '[[error:invalid-data]]');
				done();
			});
		});

		it('should infinite load topic posts', (done) => {
			socketTopics.loadMore({ uid: adminUid }, { tid: tid, after: 0, count: 10 }, (err, data) => {
				assert.ifError(err);
				assert(data.posts);
				assert(data.privileges);
				done();
			});
		});
	});

	describe('topics search', () => {
		it('should error with invalid data', async () => {
			try {
				await topics.search(null, null);
				assert(false);
			} catch (err) {
				assert.equal(err.message, '[[error:invalid-data]]');
			}
		});

		it('should return results', async () => {
			const plugins = require('../src/plugins');
			plugins.hooks.register('myTestPlugin', {
				hook: 'filter:topic.search',
				method: function (data, callback) {
					callback(null, [1, 2, 3]);
				},
			});
			const results = await topics.search(topic.tid, 'test');
			assert.deepEqual(results, [1, 2, 3]);
		});
	});

	it('should check if user is moderator', (done) => {
		socketTopics.isModerator({ uid: adminUid }, topic.tid, (err, isModerator) => {
			assert.ifError(err);
			assert(!isModerator);
			done();
		});
	});

	describe('next post index', () => {
		it('should error with invalid data', async () => {
			await assert.rejects(socketTopics.getMyNextPostIndex({ uid: 1 }, null), { message: '[[error:invalid-data]]' });
			await assert.rejects(socketTopics.getMyNextPostIndex({ uid: 1 }, {}), { message: '[[error:invalid-data]]' });
			await assert.rejects(socketTopics.getMyNextPostIndex({ uid: 1 }, { tid: 1 }), { message: '[[error:invalid-data]]' });
			await assert.rejects(socketTopics.getMyNextPostIndex({ uid: 1 }, { tid: 1, index: 1 }), { message: '[[error:invalid-data]]' });
		});

		it('should return 0 if user has no posts in topic', async () => {
			const uid = await User.create({ username: 'indexposter' });
			const t = await topics.post({ uid: uid, title: 'topic 1', content: 'content 1', cid: categoryObj.cid });
			const index = await socketTopics.getMyNextPostIndex({ uid: adminUid }, { tid: t.topicData.tid, index: 1, sort: 'oldest_to_newest' });
			assert.strictEqual(index, 0);
		});
	});

	describe('tag privilege', () => {
		let uid;
		let cid;
		before(async () => {
			uid = await User.create({ username: 'tag_poster' });
			const category = await categories.create({ name: 'tag category' });
			cid = category.cid;
		});

		it('should fail to post if user does not have tag privilege', (done) => {
			privileges.categories.rescind(['groups:topics:tag'], cid, 'registered-users', (err) => {
				assert.ifError(err);
				topics.post({ uid: uid, cid: cid, tags: ['tag1'], title: 'topic with tags', content: 'some content here' }, (err) => {
					assert.equal(err.message, '[[error:no-privileges]]');
					done();
				});
			});
		});
	});

	describe('scheduled topics', () => {
		let categoryObj;
		let topicData;
		let topic;
		let adminApiOpts;
		let postData;
		const replyData = {
			body: {
				content: 'a reply by guest',
			},
		};

		before(async () => {
			adminApiOpts = {
				jar: adminJar,
				headers: {
					'x-csrf-token': csrf_token,
				},
			};
			categoryObj = await categories.create({
				name: 'Another Test Category',
				description: 'Another test category created by testing script',
			});
			topic = {
				uid: adminUid,
				cid: categoryObj.cid,
				title: 'Scheduled Test Topic Title',
				content: 'The content of scheduled test topic',
				timestamp: new Date(Date.now() + 86400000).getTime(),
			};
		});

		it('should create a scheduled topic as pinned, deleted, included in "topics:scheduled" zset and with a timestamp in future', async () => {
			topicData = (await topics.post(topic)).topicData;
			topicData = await topics.getTopicData(topicData.tid);

			assert(topicData.pinned);
			assert(topicData.deleted);
			assert(topicData.scheduled);
			assert(topicData.timestamp > Date.now());
			const score = await db.sortedSetScore('topics:scheduled', topicData.tid);
			assert(score);
			// should not be in regular category zsets
			const isMember = await db.isMemberOfSortedSets([
				`cid:${categoryObj.cid}:tids`,
				`cid:${categoryObj.cid}:tids:votes`,
				`cid:${categoryObj.cid}:tids:posts`,
			], topicData.tid);
			assert.deepStrictEqual(isMember, [false, false, false]);
		});

		it('should update poster\'s lastposttime with "action time"', async () => {
			// src/user/posts.js:56
			const data = await User.getUsersFields([adminUid], ['lastposttime']);
			assert.notStrictEqual(data[0].lastposttime, topicData.lastposttime);
		});

		it('should not load topic for an unprivileged user', async () => {
			const { response, body } = await request.get(`${nconf.get('url')}/topic/${topicData.slug}`);
			assert.strictEqual(response.statusCode, 404);
			assert(body);
		});

		it('should load topic for a privileged user', async () => {
			const { response, body } = await request.get(`${nconf.get('url')}/topic/${topicData.slug}`, { jar: adminJar });
			assert.strictEqual(response.statusCode, 200);
			assert(body);
		});

		it('should not be amongst topics of the category for an unprivileged user', async () => {
			const { body } = await request.get(`${nconf.get('url')}/api/category/${categoryObj.slug}`);
			assert.strictEqual(body.topics.filter(topic => topic.tid === topicData.tid).length, 0);
		});

		it('should be amongst topics of the category for a privileged user', async () => {
			const { body } = await request.get(`${nconf.get('url')}/api/category/${categoryObj.slug}`, { jar: adminJar });
			const topic = body.topics.filter(topic => topic.tid === topicData.tid)[0];
			assert.strictEqual(topic && topic.tid, topicData.tid);
		});

		it('should load topic for guests if privilege is given', async () => {
			await privileges.categories.give(['groups:topics:schedule'], categoryObj.cid, 'guests');
			const { response, body } = await request.get(`${nconf.get('url')}/topic/${topicData.slug}`);
			assert.strictEqual(response.statusCode, 200);
			assert(body);
		});

		it('should be amongst topics of the category for guests if privilege is given', async () => {
			const { body } = await request.get(`${nconf.get('url')}/api/category/${categoryObj.slug}`);
			const topic = body.topics.filter(topic => topic.tid === topicData.tid)[0];
			assert.strictEqual(topic && topic.tid, topicData.tid);
		});

		it('should not allow deletion of a scheduled topic', async () => {
			const { response } = await request.delete(`${nconf.get('url')}/api/v3/topics/${topicData.tid}/state`, adminApiOpts);
			assert.strictEqual(response.statusCode, 400);
		});

		it('should not allow to unpin a scheduled topic', async () => {
			const { response } = await request.delete(`${nconf.get('url')}/api/v3/topics/${topicData.tid}/pin`, adminApiOpts);
			assert.strictEqual(response.statusCode, 400);
		});

		it('should not allow to restore a scheduled topic', async () => {
			const { response } = await request.put(`${nconf.get('url')}/api/v3/topics/${topicData.tid}/state`, adminApiOpts);
			assert.strictEqual(response.statusCode, 400);
		});

		it('should not allow unprivileged to reply', async () => {
			await privileges.categories.rescind(['groups:topics:schedule'], categoryObj.cid, 'guests');
			await privileges.categories.give(['groups:topics:reply'], categoryObj.cid, 'guests');
			const { response } = await request.post(`${nconf.get('url')}/api/v3/topics/${topicData.tid}`, replyData);
			assert.strictEqual(response.statusCode, 403);
		});

		it('should able to publish a scheduled topic', async () => {
			const topicTimestamp = await topics.getTopicField(topicData.tid, 'timestamp');

			mockdate.set(topicTimestamp);
			await topics.scheduled.handleExpired();

			topicData = await topics.getTopicData(topicData.tid);
			assert(!topicData.pinned);
			assert(!topicData.deleted);
			// Should remove from topics:scheduled upon publishing
			const score = await db.sortedSetScore('topics:scheduled', topicData.tid);
			assert(!score);
		});

		it('should update poster\'s lastposttime after a ST published', async () => {
			const data = await User.getUsersFields([adminUid], ['lastposttime']);
			assert.strictEqual(adminUid, topicData.uid);
			assert.strictEqual(data[0].lastposttime, topicData.lastposttime);
		});

		it('should not be able to schedule a "published" topic', async () => {
			const newDate = new Date(Date.now() + 86400000).getTime();
			const editData = { ...adminApiOpts, body: { ...topic, pid: topicData.mainPid, timestamp: newDate } };
			const { body } = await request.put(`${nconf.get('url')}/api/v3/posts/${topicData.mainPid}`, editData);
			assert.strictEqual(body.response.timestamp, Date.now());
			mockdate.reset();
		});

		it('should remove from topics:scheduled on purge', async () => {
			const score = await db.sortedSetScore('topics:scheduled', topicData.tid);
			assert(!score);
		});
	});
	describe('topic solved and unsolved', () => {
		let uid;
		let topic;
		before(async () => {
			uid = await User.create({ username: 'topicPoster' });
			topic = await topics.post({
				uid: uid,
				title: 'topic title',
				content: 'some content',
				cid: categoryObj.cid,
			});
		});

		it('should mark topic as solved', async () => {
			const testTopicBefore = await db.getObject(`topic:${topic.topicData.tid}`);
			assert.equal(testTopicBefore.solved, 0);
			await apiTopics.solved({ user: { uid: uid } }, { tid: topic.topicData.tid });
			const testTopicAfter = await db.getObject(`topic:${topic.topicData.tid}`);
			assert.equal(testTopicAfter.solved, 1);
		});

		it('should mark topic as unsolved', async () => {
			await apiTopics.solved({ user: { uid: uid } }, { tid: topic.topicData.tid });
			const testTopicSolved = await db.getObject(`topic:${topic.topicData.tid}`);
			assert.equal(testTopicSolved.solved, 1);
			await apiTopics.unsolve({ user: { uid: uid } }, { tid: topic.topicData.tid });
			const testTopicUnsolved = await db.getObject(`topic:${topic.topicData.tid}`);
			assert.equal(testTopicUnsolved.solved, 0);
		});

		it('should error if not logged in', async () => {
			try {
				await apiTopics.solved({ user: { uid: 0 } }, { tid: topic.topicData.tid });
				assert(false);
			} catch (err) {
				assert.equal(err.message, '[[error:not-logged-in]]');
			}
		});

		it('should error with topic that does not exist', async () => {
			try {
				await apiTopics.solved({ user: { uid: uid } }, { tid: -1 });
				assert(false);
			} catch (err) {
				assert.equal(err.message, '[[error:no-topic]]');
			}
		});
	});
});

describe('Topics\'', async () => {
	let files;

	before(async () => {
		files = await file.walk(path.resolve(__dirname, './topics'));
	});

	it('subfolder tests', () => {
		files.forEach((filePath) => {
			require(filePath);
		});
	});
});
