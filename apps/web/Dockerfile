FROM node:20-alpine

WORKDIR /app

# Create a simple Express server instead of Next.js
RUN npm init -y && \
    npm install express

# Create a simple server
RUN echo 'const express = require("express"); \
const app = express(); \
const port = 3000; \
app.get("/", (req, res) => { \
  res.send("<h1>Next.js Web App</h1><p>This is a placeholder server for the Next.js web app.</p>"); \
}); \
app.listen(port, "0.0.0.0", () => { \
  console.log(`Server running at http://0.0.0.0:${port}`); \
});' > index.js

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "index.js"] 