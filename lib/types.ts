export type EventType = "quali" | "sprint" | "race";

export type DriverResult = {
  driver_id: string;
  actual_position: number;
};

export type DriverPrediction = {
  driver_id: string;
  predicted_position: number;
};
