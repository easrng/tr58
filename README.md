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

// { type: 'Text', value: "here's a link: " }
// { type: 'URL', value: 'https://en.wikipedia.org/wiki/Electric_bus_(disambiguation)' }
// { type: 'Text', value: '.\nand another one〜' }
// { type: 'URL', value: 'https://ja.wikipedia.org/wiki/萌え' }
// { type: 'Text', value: '\nit handles lots of nesting: ' }
// { type: 'URL', value: 'https://example.com/([([([])])])' }
// { type: 'Text', value: ']\nemails are also detected: ' }
// { type: 'URL', value: 'no-reply@example.com' }
```
