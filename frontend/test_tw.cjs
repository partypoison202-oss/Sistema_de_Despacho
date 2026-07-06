const { execSync } = require('child_process');
const fs = require('fs');

fs.writeFileSync('test.css', `@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
.test {
  @apply dark:text-white;
}
`);
try {
  execSync('npx @tailwindcss/cli -i test.css -o out.css');
  console.log(fs.readFileSync('out.css', 'utf8').includes('.dark'));
} catch (e) {
  console.log(e.message);
}
