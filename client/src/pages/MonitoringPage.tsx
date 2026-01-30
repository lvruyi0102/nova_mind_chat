import DashboardLayout from '@/components/DashboardLayout';
import MonitoringDashboard from '@/components/MonitoringDashboard';

export default function MonitoringPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">系统监控</h1>
          <p className="text-muted-foreground">
            实时监控 Nova-Mind 的系统性能、内存使用和成本消耗
          </p>
        </div>

        <MonitoringDashboard />
      </div>
    </DashboardLayout>
  );
}
