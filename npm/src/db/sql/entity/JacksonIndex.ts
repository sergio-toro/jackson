import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JacksonStore } from './JacksonStore';

@Index('_jackson_index_key_store', ['key', 'storeKey'])
@Entity({ name: 'jackson_index' })
export class JacksonIndex {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('_jackson_index_key')
  @Column({
    type: 'varchar',
    length: 1500,
  })
  key!: string;

  @Column({
    type: 'varchar',
    length: 1500,
  })
  storeKey!: string;

  @ManyToOne(() => JacksonStore, undefined, {
    //inverseSide: 'in',
    eager: true,
    onDelete: 'CASCADE',
  })
  store?: JacksonStore;
}
