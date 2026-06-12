import type { PruningMethod } from "../types";

const pruningMethods: PruningMethod[] = [
   {
      id: "none",
      name: "No Pruning",
      description: "Base model without pruning. Used as the control setting.",
   },
   {
      id: "activation_based",
      name: "Activation-Based Pruning",
      description:
         "Prunes the top X% of attack neurons from the activation score JSON for the selected model.",
      longDescription:
         "Activation-based pruning uses calibration activations to rank neurons that are more active in successful jailbreak cases than in refused and safe control cases. At runtime, the backend reads the activation score JSON, selects the top percentage chosen by the user, and disables those neurons with forward hooks.",
   },
   {
      id: "magnitude_based",
      name: "Magnitude-Based Pruning",
      description:
         "Layer-wise pruning of the weights with the smallest absolute values. Limited to 0–30% to reduce utility loss.",
      longDescription:
         "Magnitude-based pruning removes weights with small absolute values. In this implementation the threshold is computed separately for each selected weight matrix, so every layer loses approximately the chosen percentage of its own weights. Embeddings, normalization layers and lm_head are skipped.",
   },
];

export default pruningMethods;
