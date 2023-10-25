import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('_jackson_index_key_store', ['key', 'storeKey'])
@Entity({ name: 'jackson_index' })
export class JacksonIndex {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('_jackson_index_key')
  @Column({
    type: 'varchar',
    length: 250,
  })
  key!: string;

  @Index('_jackson_index_store')
  @Column({
    type: 'varchar',
    length: 250,
  })
  storeKey!: string;
}
