export function shouldShowMaterialLoadingState({
  materialsLoading,
  defaultMaterialId,
  materialCount,
  mode,
}: {
  materialsLoading: boolean;
  defaultMaterialId?: string;
  materialCount: number;
  mode: "receive" | "use" | "return" | "adjust";
}) {
  if (materialsLoading) {
    return true;
  }

  if (mode !== "receive" && mode !== "use") {
    return false;
  }

  // A resolved empty list should render the empty state instead of remaining stuck in
  // a loading state just because a default material was preselected.
  return false;
}
