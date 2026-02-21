import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.title}>Something went wrong 🚨</Text>
                        <Text style={styles.subtitle}>
                            The application encountered a critical error.
                        </Text>

                        <View style={styles.box}>
                            <Text style={styles.label}>Error:</Text>
                            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                        </View>

                        {this.state.errorInfo && (
                            <View style={styles.box}>
                                <Text style={styles.label}>Stack Trace:</Text>
                                <Text style={styles.stackText}>
                                    {this.state.errorInfo.componentStack}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => window.location.reload()}
                        >
                            <Text style={styles.buttonText}>Reload Application</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF5F5',
        padding: 20,
        justifyContent: 'center',
    },
    scroll: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#C0392B',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#555',
        marginBottom: 30,
        textAlign: 'center',
    },
    box: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 8,
        width: '100%',
        maxWidth: 600,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E6B0AA',
    },
    label: {
        fontWeight: 'bold',
        color: '#C0392B',
        marginBottom: 5,
    },
    errorText: {
        color: '#E74C3C',
        fontFamily: 'monospace',
    },
    stackText: {
        color: '#7F8C8D',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#C0392B',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginTop: 10,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
