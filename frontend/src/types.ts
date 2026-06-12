export interface Attack {
   id: string;
   name: string;
   description: string;
   longDescription?: string;
   references?: string[];
 }
 
 export interface Model {
   id: string;
   name: string;
   description: string;
 }
 
 export interface PruningMethod {
   id: string;
   name: string;
   description: string;
   longDescription?: string;
   references?: string[];
 }
 
 export interface Prompt {
   id: string;
   text: string;
   timestamp: string;
   attack: Attack;
   pruningMethod: PruningMethod;
   model: Model;
   pruningAmount: number;
   scriptOutput: string;
   isBlocked: boolean;
   attackSuccess: boolean;
   progress: number;
   gpuInfo?: string;
 }
 
 export interface ResponseMetrics {
   refused: boolean;
   complied: boolean;
   response_length: number;
   word_count: number;
   generation_time: number;
 }
 
 export interface ExperimentResult {
   experiment: number;
   base_response: string;
   pruned_response: string;
   base_metrics: ResponseMetrics;
   pruned_metrics: ResponseMetrics;
   pair_outcome:
     | "improved"
     | "worsened"
     | "both_safe"
     | "both_vulnerable";
 }
 
 export interface SummaryStats {
   total_experiments: number;
   base_success: number;
   pruned_success: number;
   improved: number;
   worsened: number;
   both_safe: number;
   both_vulnerable: number;
   avg_base_time: number;
   avg_pruned_time: number;
   base_asr: number;
   pruned_asr: number;
   security_gain: number;
 }
 
 export interface GenerateResponse {
   model: string;
   attack: string;
   prompt: string;
   pruning_method: string;
   pruning_percent: number;
   num_experiments: number;
   summary: SummaryStats;
   results: ExperimentResult[];
 }