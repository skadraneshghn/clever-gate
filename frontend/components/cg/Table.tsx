"use client";

import { Table, ScrollArea, Box, Pagination, Center, Text, Stack, Group, ThemeIcon } from "@mantine/core";
import { motion } from "framer-motion";
import { FiInbox, FiLoader } from "react-icons/fi";
import type { ReactNode } from "react";

export interface CgColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string | number;
}

interface CgTableProps<T> {
  columns: CgColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

export function CgTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  page = 1,
  pageSize = 10,
  total = rows.length,
  onPageChange,
  emptyMessage = "No data",
}: CgTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <Stack gap="sm">
      <ScrollArea>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.key} style={{ width: col.width }}>
                  {col.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading && (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Group gap="sm">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      >
                        <ThemeIcon size={32} radius="xl" variant="light" color="brand">
                          <FiLoader size={16} />
                        </ThemeIcon>
                      </motion.div>
                      <Text c="dimmed" size="sm">Loading…</Text>
                    </Group>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}
            {!loading && rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      >
                        <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                          <FiInbox size={20} />
                        </ThemeIcon>
                      </motion.div>
                      <Text c="dimmed" size="sm">{emptyMessage}</Text>
                    </Stack>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}
            {!loading &&
              rows.map((row, i) => (
                <Table.Tr
                  key={rowKey(row)}
                  style={{
                    animation: `cg-row-in 0.3s ease-out ${i * 0.02}s both`,
                  }}
                >
                  {columns.map((col) => (
                    <Table.Td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {onPageChange && total > pageSize && (
        <Group justify="center">
          <Pagination value={page} onChange={onPageChange} total={totalPages} size="sm" />
        </Group>
      )}
    </Stack>
  );
}
