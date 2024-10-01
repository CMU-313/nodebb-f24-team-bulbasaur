## User Story 1: Post Content Preview

### Using the Feature
To preview the content for a particular main post, navigate to any category page (e.g. *General Discussion*).
Here, for all existing topics, the first 100 characters of the main post content should be displayed under
the topic title as shown below.

![Sample Post Content Preview](UserGuideScreenshots/post_preview_example.jpg)

If the content is less than or equal to 100 characters, then all of the content should be shown.
Conversely, if the content it greater than 100 characters, the first 100 will be displayed followed by a "..."
When a user creates a new topic as well, the main post's content preview should be immediately displayed
after navigating back to the category page. 

### User Testing
For user testing, a user may create new topics and submit content less than, greater than,
or at exactly 100 characters to post and see if the behavior described above holds on the category page.
Additionally, the user should always be able to visually see the content preview for all posts here.
The user can confirm if the preview content indeed aligns with the actual post content. 

### Automated Testing
[**Our automated tests**]() case on the post content length being less than/equal to or greater than
100 characters. As mentioned previously, the former case would ensure that post preview content
is equal to that of the entire post content's. The latter case would gurantee that the post preview
content is equal to the first 100 characters of the actual post content followed by a "..."
We believe these tests are sufficent in terms of covering the changes we made as they align with
how we implemented and generated the post preview content in the first place. A user themselves should
be able to visually confirm changes on the site.

## User Story 2: Mark Topic as Solved or Unsolved

### Using the Feature
To view whether a topic has been solved or unsolved, navigate to any category page (e.g. *General Discussion*).
You'll be able to see a button which indicates whether any topic from that category has been solved or unsolved.
Upon clicking into a specific topic to view posts under that topic, the main topic title will display whether the topic has been solved or unsolved as well.
*insert screenshot here*

To toggle between solved and unsolved, simply click the "Solved" or "Unsolved" button and the change will be immediately reflected. The user has to be logged in to use this feature. If not, an error message will appear to alert the user that they have to be logged in.
*insert screenshot here*

### User Testing
While logged out, a user should click on the topic list view/ specific topic view, and assert that an error message to prompt user to log in pops up when they click on the button.

While logged in, a user should click on the "Solved" or "Unsolved" after logged in, and assert that the button changes from "Solved" to "Unsolved" or vice versa. After refreshing the page, the button should continue stay at that state.

### Automated Testing