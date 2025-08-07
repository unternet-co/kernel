import { Process } from '../../src';

export class SetMetadataProcess extends Process {
  static type = 'set-metadata';

  constructor(snapshot?: any) {
    super();
    if (!snapshot) {
      this.initialize();
      return;
    }
    this.name = snapshot.name;
    this.icons = snapshot.icons;
  }

  initialize() {
    this.name = 'Initialized!';
    this.icons = [{ src: 'https://example.com/img.png' }];
  }

  serialize() {
    return {
      name: this.name,
      icons: this.icons,
    };
  }
}
