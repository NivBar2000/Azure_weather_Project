import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { SavedForecastEntity } from "./saved-forecast.entity";

@Entity({ name: "users" })
@Unique("UQ_users_identity_issuer_external_subject", [
  "identityIssuer",
  "externalSubjectIdentifier",
])
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "identity_issuer", type: "text" })
  identityIssuer!: string;

  @Column({ name: "external_subject_identifier", type: "text" })
  externalSubjectIdentifier!: string;

  @Column({ name: "identity_provider", type: "text" })
  identityProvider!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => SavedForecastEntity, (forecast) => forecast.user)
  savedForecasts!: SavedForecastEntity[];
}
