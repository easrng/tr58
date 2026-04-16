# @easrng/tr58

an implementation of [UTS #58](https://www.unicode.org/reports/tr58/) link detection

## install

```
pnpm i @easrng/tr58
```

## usage

```js
import { tokenize } from "@easrng/tr58";

const sample =
  "here's a link: https://en.wikipedia.org/wiki/Electric_bus_(disambiguation).\n" +
  "and another one〜https://ja.wikipedia.org/wiki/萌え\n" +
  "it handles lots of nesting: https://example.com/([([([])])])]\n" +
  //                             this bracket isn't in the url ^
  "emails are also detected: no-reply@example.com";

for (const token of tokenize(sample)) {
  console.log(token);
}
```

```output
{ type: 'Text', value: "here's a link: " }
{
  type: 'URL',
  value: 'https://en.wikipedia.org/wiki/Electric_bus_(disambiguation)'
}
{ type: 'Text', value: '.\nand another one〜' }
{ type: 'URL', value: 'https://ja.wikipedia.org/wiki/萌え' }
{ type: 'Text', value: '\nit handles lots of nesting: ' }
{ type: 'URL', value: 'https://example.com/([([([])])])' }
{ type: 'Text', value: ']\nemails are also detected: ' }
{ type: 'URL', value: 'no-reply@example.com' }
```

## non-standard features

```js
import { tokenize } from "@easrng/tr58";

// define once for caching!
const tags = ["#", "＃", "$"];

for (const token of tokenize(
  "hey@bsky.app, #🦋 if DOS could edit (en.wikipedia.org/wiki/Edit_(MS-DOS)) why can't you #Blue🌊Wave#️⃣👩‍👩‍👧‍👦❓🔟.26. https://en.wikipedia.org/wiki/Main_Page#mp-otd-h2 $AAPL ＃ｒｋｇｋ @#chars\n@handle.com\n@full123-chars.test\na trailing bsky.app: colon\nthis #️⃣tag should not be a tag\nthis ##️⃣tag should be a tag ＃",
  {
    nonStandard: { domainHandle: true, email: false, tags },
  },
)) {
  console.log(token);
}
```

```output
{ type: 'Text', value: 'hey' }
{ type: 'URL', value: '@bsky.app' }
{ type: 'Text', value: ', if DOS could edit (' }
{ type: 'URL', value: 'en.wikipedia.org/wiki/Edit_(MS-DOS)' }
{ type: 'Text', value: ") why can't you " }
{ type: 'URL', value: '#Blue🌊Wave#️⃣👩‍👩‍👧‍👦❓🔟.26' }
{ type: 'Text', value: '. ' }
{
  type: 'URL',
  value: 'https://en.wikipedia.org/wiki/Main_Page#mp-otd-h2'
}
{ type: 'Text', value: ' ' }
{ type: 'URL', value: '$AAPL' }
{ type: 'Text', value: ' ' }
{ type: 'URL', value: '＃ｒｋｇｋ' }
{ type: 'Text', value: ' @' }
{ type: 'URL', value: '#chars' }
{ type: 'Text', value: '\n' }
{ type: 'URL', value: '@handle.com' }
{ type: 'Text', value: '\n' }
{ type: 'URL', value: '@full123-chars.test' }
{ type: 'Text', value: '\na trailing ' }
{ type: 'URL', value: 'bsky.app' }
{
  type: 'Text',
  value: ': colon\nthis #️⃣tag should not be a tag\nthis '
}
{ type: 'URL', value: '##️⃣tag' }
{ type: 'Text', value: ' should be a tag ＃' }
```
