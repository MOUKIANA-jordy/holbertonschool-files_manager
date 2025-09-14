import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.url = `mongodb://${host}:${port}`;
    this.databaseName = database;
    this.client = new MongoClient(this.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    this.db = null;
    this.connected = false;

    this._connect();
  }

  async _connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      this.connected = true;
    } catch (err) {
      this.connected = false;
    }
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.isAlive()) return 0;
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    if (!this.isAlive()) return 0;
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
