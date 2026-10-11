import { useParams } from "react-router-dom";
import { getModule } from "../api";
import { useFetch } from "./useFetch";

// Loads the module whose id is in the URL (/module/:id and /lesson/:id).
export function useRouteModule() {
  const { id = "" } = useParams();
  return useFetch(() => getModule(id), id);
}