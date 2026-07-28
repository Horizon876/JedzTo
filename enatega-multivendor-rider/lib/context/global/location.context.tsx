import React, { useMemo, useState } from "react";

import {
  ICoodinates,
  ILocationContextProps,
  ILocationProviderProps,
} from "@/lib/utils/interfaces";

const LocationContext = React.createContext<ILocationContextProps>(
  {} as ILocationContextProps,
);

// Kitchen app does not track GPS / rider location — avoid permission prompts
// and UPDATE_LOCATION mutations that return 400 for restaurant owners.
export const LocationProvider = ({ children }: ILocationProviderProps) => {
  const [locationPermission, setLocationPermission] = useState(false);
  const [location] = useState<ICoodinates>({} as ICoodinates);

  const value = useMemo(
    () => ({
      locationPermission,
      setLocationPermission,
      location,
    }),
    [locationPermission, location],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
};

export const LocationConsumer = LocationContext.Consumer;
export const useLocationContext = () => React.useContext(LocationContext);
