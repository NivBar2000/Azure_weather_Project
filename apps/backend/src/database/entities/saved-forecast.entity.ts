import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { ForecastResponse } from "../../weather/weather.types";

@Entity({ name: "saved_forecasts" })
@Index("IDX_saved_forecasts_user_saved_at", ["userId", "savedAt", "id"])
export class SavedForecastEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.savedForecasts, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "city_name", type: "text" })
  cityName!: string;

  @Column({ name: "country_code", type: "varchar", length: 2, nullable: true })
  countryCode!: string | null;

  @Column({ type: "double precision" })
  latitude!: number;

  @Column({ type: "double precision" })
  longitude!: number;

  @Column({ name: "forecast_snapshot", type: "jsonb" })
  forecastSnapshot!: ForecastResponse;

  @CreateDateColumn({
    name: "saved_at",
    type: "timestamptz",
    precision: 3,
    default: () => "CURRENT_TIMESTAMP(3)",
  })
  savedAt!: Date;
}
