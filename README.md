# Alpha Khan

Static profile site for GitHub Pages. Files: `index.html`, `style.css`, `script.js`, `post.txt`.

## Writing posts in post.txt

- A line containing only `$` separates two posts.
- The post at the top of the file is the newest.
- Plain lines are text. Long text shows 6 lines, then **Read more**.
- A link alone on its own line becomes media:
  - photo: `.jpg .jpeg .png .gif .webp .avif .svg` (several in a row make a swipeable gallery)
  - video: `.mp4 .webm .mov .m4v`
  - audio: `.mp3 .wav .m4a .aac .ogg .flac`
  - YouTube: `youtube.com/watch`, `youtu.be`, `shorts`
  - any other link becomes a link card
- Normal GitHub links (`github.com/.../blob/main/file.png`) are converted to raw links automatically.
- A link inside a sentence stays a clickable link in the text.

Example:

```
Good morning everyone.

https://github.com/user/repo/blob/main/photo1.jpg
https://github.com/user/repo/blob/main/photo2.jpg
$
Watch this

https://youtu.be/VIDEO_ID
$
Listen

https://github.com/user/repo/blob/main/song.mp3
```

## Settings

Name, photo, bio and the number of lines before **Read more** are at the top of `script.js`.

## Refresh behaviour

`post.txt` is always fetched fresh, so new posts appear on refresh. After a refresh or back navigation the page returns to the same post. If posts are published while the tab is open, a "New posts available" button appears.
