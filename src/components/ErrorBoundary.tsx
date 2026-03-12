import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-red-100 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <CardTitle className="text-red-900">Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado nesta parte do aplicativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg text-xs font-mono text-red-800 overflow-auto max-h-[150px]">
                {this.state.error?.toString()}
              </div>
              <Button 
                onClick={this.handleReset}
                className="w-full flex items-center gap-2"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
                Recarregar Aplicativo
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.children || this.props.children;
  }
}

export default ErrorBoundary;
