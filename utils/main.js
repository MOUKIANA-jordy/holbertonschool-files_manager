import dbClient from './db.mjs';

const waitConnection = () =>
  new Promise((resolve, reject) => {
    let i = 0;
    const repeatFct = async () => {
      await new Promise(r => setTimeout(r, 1000));
      i++;
      if (i >= 10) reject();
      else if (!dbClient.isAlive()) repeatFct();
      else resolve();
    };
    repeatFct();
  });

(async () => {
  console.log(dbClient.isAlive()); // false avant connexion
  await waitConnection();
  console.log(dbClient.isAlive()); // true après connexion
  console.log(await dbClient.nbUsers()); // 4
  console.log(await dbClient.nbFiles()); // 30
})();
