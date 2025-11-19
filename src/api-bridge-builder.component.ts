import { Component, ChangeDetectionStrategy, output, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { GeminiService } from './gemini.service';
import { ApiInfo, Capability, ApiBridge } from './api.model';

@Component({
  selector: 'app-api-bridge-builder',
  
  imports: [FormsModule, JsonPipe],
  templateUrl: './api-bridge-builder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiBridgeBuilderComponent {
  @Input() apis: ApiInfo[] = [];
  close = output<void>();
  createBridge = output<ApiBridge>();

  geminiService = inject(GeminiService);

  currentStep = signal(1);
  bridgeName = signal('');
  
  sourceApiName = signal('');
  sourceApi = computed(() => this.apis.find(a => a.name === this.sourceApiName()));
  sourceApiCapabilities = signal<Capability[]>([]);
  sourceCapabilityName = signal('');
  sourceCapability = computed(() => this.sourceApiCapabilities().find(c => c.name === this.sourceCapabilityName()));

  targetApiName = signal('');
  targetApi = computed(() => this.apis.find(a => a.name === this.targetApiName()));
  targetApiCapabilities = signal<Capability[]>([]);
  targetCapabilityName = signal('');
  targetCapability = computed(() => this.targetApiCapabilities().find(c => c.name === this.targetCapabilityName()));

  // Data Mapping State
  sourceSchema = signal<any[]>([]);
  targetSchema = signal<any[]>([]);
  mappings = signal<Record<string, string>>({}); // targetKey -> sourceKey
  
  isLoadingCapabilities = signal(false);
  isLoadingSchema = signal(false);
  isLoadingSuggestions = signal(false);

  async onSourceApiChange(apiName: string): Promise<void> {
    this.sourceApiName.set(apiName);
    this.sourceApiCapabilities.set([]);
    this.sourceCapabilityName.set('');
    if (!apiName) return;

    this.isLoadingCapabilities.set(true);
    try {
      const plan = await this.geminiService.generateIntegrationPlan(apiName);
      this.sourceApiCapabilities.set(plan.capabilities);
    } catch (e) {
      console.error('Failed to load source capabilities', e);
    } finally {
      this.isLoadingCapabilities.set(false);
    }
  }
  
  async onTargetApiChange(apiName: string): Promise<void> {
    this.targetApiName.set(apiName);
    this.targetApiCapabilities.set([]);
    this.targetCapabilityName.set('');
    if (!apiName) return;

    this.isLoadingCapabilities.set(true);
    try {
      const plan = await this.geminiService.generateIntegrationPlan(apiName);
      this.targetApiCapabilities.set(plan.capabilities);
    } catch (e) {
      console.error('Failed to load target capabilities', e);
    } finally {
      this.isLoadingCapabilities.set(false);
    }
  }

  nextStep(): void {
    if (this.currentStep() === 2) {
      this.loadSchemasForMapping();
    }
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    this.currentStep.update(s => s - 1);
  }

  async loadSchemasForMapping(): Promise<void> {
    const sourceCap = this.sourceCapability();
    const targetCap = this.targetCapability();
    if (!sourceCap || !targetCap) return;
    
    this.isLoadingSchema.set(true);
    this.sourceSchema.set([]);
    this.targetSchema.set([]);
    this.mappings.set({});

    try {
      // Simulate getting schema from params
      const sourceParams = sourceCap.params.map(p => ({ key: p.name, type: p.type, description: p.label }));
      const targetParams = targetCap.params.map(p => ({ key: p.name, type: p.type, description: p.label }));
      this.sourceSchema.set(sourceParams);
      this.targetSchema.set(targetParams);
    } finally {
      this.isLoadingSchema.set(false);
    }
  }
  
  handleMapping(targetKey: string, sourceKey: string) {
    this.mappings.update(m => ({...m, [targetKey]: sourceKey}));
  }

  getSuggestions(): void {
    // This would be the place for the AI suggestion logic
    // For now, we can simulate a simple name-based mapping
    this.isLoadingSuggestions.set(true);
    setTimeout(() => {
        const newMappings: Record<string, string> = {};
        this.targetSchema().forEach(targetField => {
            const sourceField = this.sourceSchema().find(sourceField => 
                sourceField.key.toLowerCase().includes(targetField.key.toLowerCase()) ||
                targetField.key.toLowerCase().includes(sourceField.key.toLowerCase())
            );
            if(sourceField) {
                newMappings[targetField.key] = sourceField.key;
            }
        });
        this.mappings.set(newMappings);
        this.isLoadingSuggestions.set(false);
    }, 1000);
  }

  isStep1Valid(): boolean {
    return !!this.sourceApi() && !!this.sourceCapability();
  }
  
  isStep2Valid(): boolean {
    return !!this.targetApi() && !!this.targetCapability();
  }

  finish(): void {
    const bridge: ApiBridge = {
      name: this.bridgeName() || `${this.sourceApiName()} to ${this.targetApiName()}`,
      sourceApi: this.sourceApiName(),
      sourceCapability: this.sourceCapabilityName(),
      targetApi: this.targetApiName(),
      targetCapability: this.targetCapabilityName(),
    };
    this.createBridge.emit(bridge);
  }
}