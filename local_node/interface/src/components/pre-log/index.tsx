/* eslint-disable react-refresh/only-export-components */
import React, { useImperativeHandle, useRef, useState, forwardRef } from "react";

export type PreLogHandle = {
    appendLog: (line: string) => void;
    clearLog: () => void;
};

export const PreLog = forwardRef<PreLogHandle>((_, ref) => {
    const [log, setLog] = useState("");
    const logRef = useRef<HTMLPreElement | null>(null);

    const appendLog = (line: string) => {
        setLog((prev) => prev + (prev ? "\n" : "") + line);
        requestAnimationFrame(() => {
            if (logRef.current) {
                logRef.current.scrollTop = logRef.current.scrollHeight;
            }
        });
    };

    const clearLog = () => {
        setLog("");
    }

    useImperativeHandle(ref, () => ({
        appendLog,
        clearLog
    }));

    return <pre ref={logRef}>{log}</pre>;
});



export function usePreLog() {
    const ref = useRef<PreLogHandle>(null);

    return {
        PreLog: <PreLog ref={ref} />,
        appendLog: (line: string) => ref.current?.appendLog(line),
        clearLog: () => ref.current?.clearLog(),
    };
}