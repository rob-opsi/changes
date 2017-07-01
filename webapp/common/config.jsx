// XXX(dcramer): can't be asked to figure out how to work Redux
export class Config {
  constructor() {
    this.data = {};
  }

  set(key, value) {
    this.data[key] = value;
  }

  get(key) {
    return this.data;
  }
}

export default new Config();
