// La durée d'une étape de l'envoi, en minutes et secondes : « 42 s », « 1 min 05 s ».
export function dureeLisible(millisecondes: number): string {
  const secondes = Math.max(0, Math.floor(millisecondes / 1000));
  const minutes = Math.floor(secondes / 60);
  if (!minutes) return `${secondes} s`;
  return `${minutes} min ${String(secondes % 60).padStart(2, "0")} s`;
}
